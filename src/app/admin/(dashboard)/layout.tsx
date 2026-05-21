import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ImpersonationBanner } from "@/components/dashboard/impersonation-banner";
import { requireRole } from "@/lib/auth";
import { getActiveTenant } from "@/lib/tenant";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireRole("admin");
  const tenant = await getActiveTenant();
  return (
    <>
      {auth.impersonating && (
        <ImpersonationBanner tenantName={tenant?.name ?? "this tenant"} />
      )}
      <DashboardShell
        role="admin"
        title="Admin"
        brand={{ name: tenant?.name ?? "eurodigital.coach", logoUrl: tenant?.logoUrl ?? null }}
      >
        {children}
      </DashboardShell>
    </>
  );
}
