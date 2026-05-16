"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useState, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FilterOption {
  value: string;
  label: string;
}

interface TableToolbarProps {
  searchPlaceholder?: string;
  /** Optional status-style filter rendered as pills */
  filter?: {
    paramKey: string;
    options: FilterOption[];
  };
}

export function TableToolbar({
  searchPlaceholder = "Search…",
  filter,
}: TableToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const currentQ = searchParams.get("q") ?? "";
  const currentFilter = filter ? (searchParams.get(filter.paramKey) ?? filter.options[0]?.value) : "";
  const [value, setValue] = useState(currentQ);
  const [prevQ, setPrevQ] = useState(currentQ);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local input with the URL when it changes externally (back button,
  // filter clears search). React's "adjust state during render" pattern.
  if (currentQ !== prevQ) {
    setPrevQ(currentQ);
    setValue(currentQ);
  }

  function pushParams(next: URLSearchParams) {
    startTransition(() => {
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function onSearchChange(v: string) {
    setValue(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      if (v) next.set("q", v);
      else next.delete("q");
      pushParams(next);
    }, 300);
  }

  function onFilterClick(val: string) {
    if (!filter) return;
    const next = new URLSearchParams(searchParams.toString());
    if (val === filter.options[0]?.value) next.delete(filter.paramKey);
    else next.set(filter.paramKey, val);
    pushParams(next);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 rounded-xl border-black/10 bg-card pl-9 pr-9 text-sm shadow-none"
        />
        {pending ? (
          <Loader2 className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : value ? (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      {filter && (
        <div className="flex flex-wrap gap-1.5">
          {filter.options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onFilterClick(o.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                currentFilter === o.value
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
