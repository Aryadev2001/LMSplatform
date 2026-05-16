import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardTopbar } from "./dashboard-topbar";
import type { DashRole } from "./nav-items";

interface DashboardShellProps {
  role: DashRole;
  title: string;
  children: React.ReactNode;
}

export function DashboardShell({ role, title, children }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <DashboardSidebar role={role} />
      <SidebarInset>
        <DashboardTopbar title={title} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
