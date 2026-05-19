"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { NAV_ITEMS, ROLE_LABELS, type DashRole } from "./nav-items";
import type { TenantBrand } from "./dashboard-shell";

interface DashboardSidebarProps {
  role: DashRole;
  brand?: TenantBrand;
}

export function DashboardSidebar({ role, brand }: DashboardSidebarProps) {
  const items = NAV_ITEMS[role];
  const roleLabel = ROLE_LABELS[role];
  const brandName = brand?.name ?? "EDT";
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
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.label}
                      className="group/btn relative"
                    >
                      {isActive && (
                        <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-foreground group-data-[collapsible=icon]:hidden" />
                      )}
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
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
