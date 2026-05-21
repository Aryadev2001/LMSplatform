"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
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
import { NAV_ITEMS, ROLE_LABELS, type DashRole, type PartnerTier } from "./nav-items";
import type { TenantBrand } from "./dashboard-shell";

const TIER_RANK: Record<PartnerTier, number> = {
  basic: 0,
  standard: 1,
  premium: 2,
};

interface DashboardSidebarProps {
  role: DashRole;
  brand?: TenantBrand;
  tier?: PartnerTier;
}

export function DashboardSidebar({ role, brand, tier }: DashboardSidebarProps) {
  const items = NAV_ITEMS[role];
  const activeTier: PartnerTier = tier ?? "basic";
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
                const isLocked =
                  role === "admin" &&
                  !!item.minTier &&
                  TIER_RANK[activeTier] < TIER_RANK[item.minTier];
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
        <div className="px-3 py-3 text-[10px] uppercase tracking-widest text-muted-foreground group-data-[collapsible=icon]:hidden">
          v0.1 · build {new Date().getFullYear()}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
