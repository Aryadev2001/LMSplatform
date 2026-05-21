"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

type FilterKey = "level" | "price" | "duration";

interface FilterOption {
  value: string;
  label: string;
  count: number;
}

interface FilterGroup {
  key: FilterKey;
  title: string;
  options: FilterOption[];
}

export function ExploreFilters({
  groups,
  active,
  totalShown,
  totalAvailable,
}: {
  groups: FilterGroup[];
  active: Record<FilterKey, string[]>;
  totalShown: number;
  totalAvailable: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const toggle = useCallback(
    (key: FilterKey, value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      const current = (next.get(key) ?? "").split(",").filter(Boolean);
      const set = new Set(current);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      if (set.size === 0) next.delete(key);
      else next.set(key, Array.from(set).join(","));
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const clearAll = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("level");
    next.delete("price");
    next.delete("duration");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  const anyActive = Object.values(active).some((arr) => arr.length > 0);

  return (
    <aside
      className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border bg-white p-5 text-sm"
      style={{ borderColor: "var(--ed-line)" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ed-mute)" }}>
          Showing {totalShown} of {totalAvailable}
        </div>
        {anyActive && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[11px] font-bold uppercase tracking-wider underline-offset-2 hover:underline"
            style={{ color: "var(--ed-blue)" }}
          >
            Clear
          </button>
        )}
      </div>

      {groups.map((g) => (
        <div key={g.key} className="mb-6 last:mb-0">
          <div
            className="mb-3 text-[11px] font-extrabold uppercase tracking-widest"
            style={{ color: "var(--ed-ink)" }}
          >
            {g.title}
          </div>
          <ul className="space-y-2">
            {g.options.map((o) => {
              const isActive = active[g.key].includes(o.value);
              const disabled = o.count === 0 && !isActive;
              return (
                <li key={o.value}>
                  <label
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors ${
                      disabled ? "cursor-not-allowed opacity-50" : "hover:bg-[var(--ed-bg)]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isActive}
                        disabled={disabled}
                        onChange={() => toggle(g.key, o.value)}
                        className="size-4 rounded border-[var(--ed-line)] accent-[var(--ed-blue)]"
                      />
                      <span style={{ color: "var(--ed-ink-2)" }}>{o.label}</span>
                    </span>
                    <span className="text-xs tabular-nums" style={{ color: "var(--ed-mute)" }}>
                      {o.count}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div
        className="mt-6 rounded-xl border border-dashed p-3 text-[11px] leading-relaxed"
        style={{ borderColor: "var(--ed-line)", color: "var(--ed-mute)" }}
      >
        Ratings, language and feature filters are coming in the next release —
        we&apos;re wiring those fields onto courses now.
      </div>
    </aside>
  );
}
