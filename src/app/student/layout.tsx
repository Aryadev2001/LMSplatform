import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { getActiveTenant } from "@/lib/tenant";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireRole("student");
  const tenant = await getActiveTenant();
  return (
    <DashboardShell
      role="student"
      title="Student"
      brand={{ name: tenant?.name ?? "EDT", logoUrl: tenant?.logoUrl ?? null }}
    >
      {children}
    </DashboardShell>
  );
}
