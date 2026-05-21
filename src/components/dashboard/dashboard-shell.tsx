import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardTopbar } from "./dashboard-topbar";
import type { DashRole, FeatureKey, PartnerTier } from "./nav-items";

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
  /** Per-feature explicit grants/revokes; beats tier default. */
  featureOverrides?: Partial<Record<FeatureKey, boolean>>;
  children: React.ReactNode;
}

export function DashboardShell({
  role,
  title,
  brand,
  tier,
  featureOverrides,
  children,
}: DashboardShellProps) {
  return (
    <SidebarProvider>
      <DashboardSidebar
        role={role}
        brand={brand}
        tier={tier}
        featureOverrides={featureOverrides}
      />
      <SidebarInset>
        <DashboardTopbar title={title} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
