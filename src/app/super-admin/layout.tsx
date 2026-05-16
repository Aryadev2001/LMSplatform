import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireSuper } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuper(); // SUPER_SUPPORT and up; redirects /forbidden otherwise
  return (
    <DashboardShell role="super" title="Super Admin">
      {children}
    </DashboardShell>
  );
}
