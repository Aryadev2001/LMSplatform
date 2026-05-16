import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { getActiveTenant } from "@/lib/tenant";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin");
  const tenant = await getActiveTenant();
  return (
    <DashboardShell
      role="admin"
      title="Admin"
      brand={{ name: tenant?.name ?? "EDT", logoUrl: tenant?.logoUrl ?? null }}
    >
      {children}
    </DashboardShell>
  );
}
