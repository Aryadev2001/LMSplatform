import Link from "next/link";
import { GraduationCap, Star } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { MarketCourse } from "@/lib/marketplace";

const TIER_LABEL = { low: "Beginner", mid: "Intermediate", high: "Advanced" } as const;

export function EuroCourseCard({ c }: { c: MarketCourse }) {
  const href = c.slug ? `/courses/${c.slug}` : `/institute/${c.instituteSlug}`;
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-white transition-shadow hover:shadow-lg"
      style={{ borderColor: "var(--ed-line)" }}
    >
      <div
        className="relative flex h-32 items-center justify-center"
        style={{ background: "var(--ed-gradient)" }}
      >
        <div className="absolute inset-0" style={{ background: "var(--ed-halftone)" }} />
        <GraduationCap className="relative size-9 text-white/90" />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ color: "var(--ed-ink)" }}>
          {TIER_LABEL[c.tier]}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--ed-blue)" }}>
          {c.instituteName}
        </div>
        <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug" style={{ color: "var(--ed-ink)" }}>
          {c.title}
        </h3>
        {c.tagline && (
          <p className="mt-1 line-clamp-2 text-xs" style={{ color: "var(--ed-mute)" }}>
            {c.tagline}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--ed-line)" }}>
          <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "var(--ed-warn)" }}>
            <Star className="size-3.5 fill-current" /> 4.8
          </span>
          <span className="text-base font-extrabold" style={{ color: "var(--ed-ink)" }}>
            {formatCurrency(c.priceCents, c.currency)}
            {c.type === "subscription" && (
              <span className="text-[11px] font-medium" style={{ color: "var(--ed-mute)" }}> /mo</span>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
