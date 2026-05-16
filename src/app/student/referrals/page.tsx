import { headers } from "next/headers";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, referrals } from "@/db/schema";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";
import { ensureReferralCode, tierForCount, TIER_THRESHOLDS } from "@/lib/referral";
import { formatDate } from "@/lib/format";
import { CopyLink } from "./copy-link";

export const dynamic = "force-dynamic";

export default async function StudentReferralsPage() {
  const me = await requireRole("student");

  const [u] = await db
    .select({
      id: users.id,
      referralCode: users.referralCode,
      pointsBalance: users.pointsBalance,
      currentTier: users.currentTier,
    })
    .from(users)
    .where(eq(users.clerkId, me.userId))
    .limit(1);

  if (!u) {
    return (
      <div>
        <PageHeader eyebrow="Referrals" title="Referrals" />
        <p className="text-sm text-muted-foreground">Account not fully provisioned yet.</p>
      </div>
    );
  }

  const tenant = await getTenantFromRequest();
  let code = u.referralCode;
  if (!code && tenant) {
    code = await ensureReferralCode(u.id, tenant.slug);
  }

  const list = await db
    .select({
      email: users.email,
      fullName: users.fullName,
      status: referrals.status,
      createdAt: referrals.createdAt,
      firstPurchaseAt: referrals.firstPurchaseAt,
    })
    .from(referrals)
    .leftJoin(users, eq(users.id, referrals.referredUserId))
    .where(eq(referrals.referrerId, u.id))
    .orderBy(desc(referrals.createdAt));

  const activated = list.filter((r) => r.status === "ACTIVATED").length;
  const tier = tierForCount(activated);
  const next = TIER_THRESHOLDS.find((t) => t.min > activated);

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "localhost:3000";
  const base = process.env.NEXT_PUBLIC_APP_URL ?? `${proto}://${host}`;
  const shareUrl = code ? `${base}/enroll?ref=${encodeURIComponent(code)}` : "";

  const stats = [
    { label: "Points balance", value: `${u.pointsBalance}` },
    { label: "Current tier", value: tier },
    { label: "Activated referrals", value: `${activated}` },
    {
      label: "Next tier",
      value: next ? `${next.tier} @ ${next.min}` : "Max tier",
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Referrals"
        title="Invite & earn"
        description="Share your link. When someone you refer makes a purchase, you earn points (₹1 = 1 point) and unlock tier rewards."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Your referral link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {shareUrl ? (
            <CopyLink url={shareUrl} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Referral code unavailable — contact support.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Code: <span className="font-mono">{code ?? "—"}</span>
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6 overflow-hidden p-0">
        <CardHeader className="p-6 pb-0">
          <CardTitle className="text-sm">People you referred</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Person</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>First purchase</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No referrals yet — share your link to get started.
                  </TableCell>
                </TableRow>
              )}
              {list.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="pl-6 text-sm">
                    {r.fullName ?? r.email ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.status === "ACTIVATED" ? "default" : "secondary"}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(r.createdAt)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.firstPurchaseAt ? formatDate(r.firstPurchaseAt) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
