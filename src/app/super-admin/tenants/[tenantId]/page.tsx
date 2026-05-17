import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db/client";
import { tenants, users, programs } from "@/db/schema";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireSuper, type SuperRole } from "@/lib/auth";
import { canWrite } from "@/lib/super";
import { TenantEditForm } from "./tenant-edit-form";

export const dynamic = "force-dynamic";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const me = await requireSuper();
  const writable = canWrite(me.rawRole as SuperRole);

  const [t] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!t) notFound();

  const [[uc], [cc]] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.tenantId, tenantId)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(programs)
      .where(eq(programs.tenantId, tenantId)),
  ]);

  return (
    <div>
      <Link
        href="/super-admin/tenants"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        All tenants
      </Link>

      <PageHeader
        eyebrow={`/${t.slug}`}
        title={t.name}
        description={`Created ${t.createdAt.toISOString().slice(0, 10)} · ${uc?.n ?? 0} users · ${cc?.n ?? 0} courses`}
        actions={<Badge variant="outline">{t.status}</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tenant settings</CardTitle>
            </CardHeader>
            <CardContent>
              <TenantEditForm
                writable={writable}
                tenant={{
                  id: t.id,
                  name: t.name,
                  slug: t.slug,
                  status: t.status,
                  brandPrimaryColor: t.brandPrimaryColor,
                  brandSecondaryColor: t.brandSecondaryColor,
                  heroTagline: t.heroTagline ?? "",
                  referralEnabled: t.referralEnabled,
                  referralPointsPercent: t.referralPointsPercent,
                  referralRedeemMaxPercent: t.referralRedeemMaxPercent,
                }}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Payment gateway</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {t.razorpayKeyId && t.razorpayKeySecret ? (
                <>
                  <Badge variant="default">Razorpay connected</Badge>
                  <p className="font-mono text-xs text-muted-foreground">
                    {t.razorpayKeyId.length > 12
                      ? `${t.razorpayKeyId.slice(0, 12)}…${t.razorpayKeyId.slice(-4)}`
                      : t.razorpayKeyId}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Secret is encrypted and not visible here — supervision only.
                    The tenant manages their own keys.
                  </p>
                </>
              ) : (
                <>
                  <Badge variant="outline">Not connected</Badge>
                  <p className="text-[11px] text-muted-foreground">
                    The tenant hasn&apos;t connected a payment gateway yet. They
                    do this from their own dashboard → Settings → Payment gateway.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Custom domain</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {t.customDomain
                ? `${t.customDomain} — ${t.customDomainStatus}`
                : "None. Managed via the manual DNS queue (P7-5)."}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
