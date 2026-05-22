"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, LogOut } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { BrandMark } from "@/components/brand";
import { EuroLogo } from "@/components/euro/euro-logo";
import {
  NAV_ITEMS,
  ROLE_LABELS,
  type DashRole,
  type FeatureKey,
  type PartnerTier,
} from "./nav-items";
import type { TenantBrand } from "./dashboard-shell";

export interface DashboardAccount {
  /** Whichever is set, in priority: full name → email. Used as the display
   *  name; email is shown on its own line below so it's always visible. */
  displayName: string;
  email: string;
}

const TIER_RANK: Record<PartnerTier, number> = {
  basic: 0,
  standard: 1,
  premium: 2,
};

interface DashboardSidebarProps {
  role: DashRole;
  brand?: TenantBrand;
  tier?: PartnerTier;
  featureOverrides?: Partial<Record<FeatureKey, boolean>>;
  /** Signed-in account info, surfaced in the sidebar footer so users can
   *  see which session is active and one-click sign out. */
  account?: DashboardAccount;
}

export function DashboardSidebar({
  role,
  brand,
  tier,
  featureOverrides,
  account,
}: DashboardSidebarProps) {
  const items = NAV_ITEMS[role];
  const activeTier: PartnerTier = tier ?? "basic";
  const overrides = featureOverrides ?? {};
  const roleLabel = ROLE_LABELS[role];
  const brandName = brand?.name ?? "eurodigital.coach";
  // Show the eurodigital wordmark when we're branded as the platform itself
  // (default tenant / super-admin / unbranded admin). Real tenants get their
  // own logoUrl-or-BrandMark + name below.
  const isPlatform = !brand?.logoUrl && brandName === "eurodigital.coach";
  const pathname = usePathname();
  const isActiveLink = (href: string) => {
    if (pathname === href) return true;
    const rootSegment = "/" + href.split("/")[1];
    if (href === rootSegment) return false;
    return pathname.startsWith(href);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-black/5">
      <SidebarHeader>
        {isPlatform ? (
          <div className="flex flex-col gap-1 px-2 py-4">
            <EuroLogo className="text-xl" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground group-data-[collapsible=icon]:hidden">
              {roleLabel}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-2 py-4">
            {brand?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logoUrl}
                alt={brandName}
                className="size-12 shrink-0 rounded-lg object-contain"
              />
            ) : (
              <BrandMark className="size-12 shrink-0 text-foreground" />
            )}
            <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate text-base font-bold tracking-tight">{brandName}</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {roleLabel}
              </span>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-1">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = isActiveLink(item.href);
                // Override-aware lock: explicit grant unlocks, explicit revoke
                // locks, otherwise fall back to the tier-rank comparison.
                let isLocked = false;
                if (role === "admin" && item.minTier) {
                  const explicit = item.featureKey
                    ? overrides[item.featureKey]
                    : undefined;
                  if (explicit === true) isLocked = false;
                  else if (explicit === false) isLocked = true;
                  else
                    isLocked =
                      TIER_RANK[activeTier] < TIER_RANK[item.minTier];
                }
                const href = isLocked
                  ? `/admin/partner?locked=${encodeURIComponent(item.label)}&min=${item.minTier}`
                  : item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={href} />}
                      isActive={isActive}
                      tooltip={isLocked ? `${item.label} — ${item.minTier} tier` : item.label}
                      className="group/btn relative"
                    >
                      {isActive && (
                        <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-foreground group-data-[collapsible=icon]:hidden" />
                      )}
                      <item.icon className={`size-4 ${isLocked ? "opacity-50" : ""}`} />
                      <span className={isLocked ? "opacity-50" : ""}>{item.label}</span>
                      {isLocked && (
                        <Lock className="ml-auto size-3 opacity-60 group-data-[collapsible=icon]:hidden" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {account && (
          <div className="border-t border-black/5 group-data-[collapsible=icon]:hidden">
            {/* Signed-in identity — always visible so a stale Clerk session
                from prior testing can't masquerade as "wrong account". */}
            <div className="px-3 pt-3">
              <div
                className="truncate text-xs font-bold"
                title={account.displayName}
              >
                {account.displayName}
              </div>
              <div
                className="truncate text-[11px] text-muted-foreground"
                title={account.email}
              >
                {account.email}
              </div>
            </div>
            <SignOutButton redirectUrl="/sign-in">
              <button
                type="button"
                className="mt-2 flex w-full items-center gap-1.5 rounded-md px-3 py-1.5 text-left text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <LogOut className="size-3.5" /> Sign out
              </button>
            </SignOutButton>
          </div>
        )}
        <div className="px-3 py-3 text-[10px] uppercase tracking-widest text-muted-foreground group-data-[collapsible=icon]:hidden">
          v0.1 · build {new Date().getFullYear()}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
