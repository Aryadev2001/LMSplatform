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
              <CardTitle className="text-sm">Payments</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Each tenant connects their own Razorpay. Checkout is still on the shared
              mock until live Razorpay keys are wired — secret-key storage is deferred
              until encryption-at-rest is in place (no plaintext secrets).
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
