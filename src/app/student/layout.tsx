import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireRole("student");
  return (
    <DashboardShell role="student" title="Student">
      {children}
    </DashboardShell>
  );
}
