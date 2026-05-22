import { eq } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ImpersonationBanner } from "@/components/dashboard/impersonation-banner";
import { requireRole } from "@/lib/auth";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { getActiveTenant } from "@/lib/tenant";
import { getTenantAccess } from "@/lib/tier-lock";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireRole("admin");
  const [tenant, access, meRow] = await Promise.all([
    getActiveTenant(),
    getTenantAccess(),
    db
      .select({ fullName: users.fullName, email: users.email })
      .from(users)
      .where(eq(users.clerkId, auth.userId))
      .limit(1)
      .then((rows) => rows[0]),
  ]);
  return (
    <>
      {auth.impersonating && (
        <ImpersonationBanner tenantName={tenant?.name ?? "this tenant"} />
      )}
      <DashboardShell
        role="admin"
        title="Admin"
        brand={{ name: tenant?.name ?? "eurodigital.coach", logoUrl: tenant?.logoUrl ?? null }}
        tier={access.tier}
        featureOverrides={access.overrides}
        account={
          meRow
            ? {
                displayName: meRow.fullName ?? meRow.email,
                email: meRow.email,
              }
            : undefined
        }
      >
        {children}
      </DashboardShell>
    </>
  );
}
