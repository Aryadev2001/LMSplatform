"use client";

import { UserButton } from "@clerk/nextjs";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Search } from "lucide-react";

interface DashboardTopbarProps {
  title: string;
  description?: string;
}

export function DashboardTopbar({ title, description }: DashboardTopbarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-black/5 bg-background/80 px-5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />
      <div className="flex min-w-0 flex-col">
        <h1 className="truncate text-sm font-semibold tracking-tight">{title}</h1>
        {description ? (
          <span className="truncate text-xs text-muted-foreground">{description}</span>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="hidden h-8 items-center gap-2 rounded-lg border border-black/8 bg-background px-3 text-xs text-muted-foreground transition-colors hover:border-black/15 hover:text-foreground md:inline-flex"
        >
          <Search className="size-3.5" />
          <span>Quick search</span>
          <kbd className="ml-2 inline-flex h-5 items-center rounded border border-black/10 bg-secondary px-1.5 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </button>
        <UserButton />
      </div>
    </header>
  );
}
