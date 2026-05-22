import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar, type DashboardAccount } from "./dashboard-sidebar";
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
  /** Signed-in identity for the sidebar footer (email + Sign Out). */
  account?: DashboardAccount;
  children: React.ReactNode;
}

export function DashboardShell({
  role,
  title,
  brand,
  tier,
  featureOverrides,
  account,
  children,
}: DashboardShellProps) {
  return (
    <SidebarProvider>
      <DashboardSidebar
        role={role}
        brand={brand}
        tier={tier}
        featureOverrides={featureOverrides}
        account={account}
      />
      <SidebarInset>
        <DashboardTopbar title={title} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
