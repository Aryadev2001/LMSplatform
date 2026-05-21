import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ImpersonationBanner } from "@/components/dashboard/impersonation-banner";
import { requireRole } from "@/lib/auth";
import { getActiveTenant } from "@/lib/tenant";
import { getActiveTier } from "@/lib/tier-lock";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireRole("admin");
  const [tenant, tier] = await Promise.all([
    getActiveTenant(),
    getActiveTier(),
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
        tier={tier}
      >
        {children}
      </DashboardShell>
    </>
  );
}
