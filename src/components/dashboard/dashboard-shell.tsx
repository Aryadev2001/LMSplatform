import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardTopbar } from "./dashboard-topbar";
import type { DashRole, PartnerTier } from "./nav-items";

export interface TenantBrand {
  name: string;
  logoUrl: string | null;
}

interface DashboardShellProps {
  role: DashRole;
  title: string;
  brand?: TenantBrand;
  /** Active tenant's partner tier; gates locked nav items in the sidebar. */
  tier?: PartnerTier;
  children: React.ReactNode;
}

export function DashboardShell({ role, title, brand, tier, children }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <DashboardSidebar role={role} brand={brand} tier={tier} />
      <SidebarInset>
        <DashboardTopbar title={title} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
