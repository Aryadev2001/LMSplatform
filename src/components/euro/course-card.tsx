import Link from "next/link";
import { Star } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { MarketCourse } from "@/lib/marketplace";

const TIER_LABEL = { low: "Beginner", mid: "Intermediate", high: "Advanced" } as const;

// Stable, well-known Unsplash photos (education / tech / study). A real
// uploaded cover (c.imageUrl) overrides this when present.
const COVERS = [
  "1517694712202-14dd9538aa97",
  "1522202176988-66273c2fd55f",
  "1454165804606-c3d57bc86b40",
  "1531403009284-440f080d1e12",
  "1498050108023-c5249f4df085",
  "1516321318423-f06f85e504b3",
  "1488190211105-8b0e65b80b4e",
  "1573164713714-d95e436ab8d6",
  "1503676260728-1c00da094a0b",
  "1543286386-713bdd548da4",
];

function coverFor(c: MarketCourse): string {
  if (c.imageUrl) return c.imageUrl;
  let h = 0;
  for (const ch of c.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const id = COVERS[h % COVERS.length];
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=60`;
}

export function EuroCourseCard({ c }: { c: MarketCourse }) {
  const href = c.slug ? `/courses/${c.slug}` : `/institute/${c.instituteSlug}`;
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-white transition-shadow hover:shadow-lg"
      style={{ borderColor: "var(--ed-line)" }}
    >
      <div
        className="relative h-36 overflow-hidden"
        style={{ background: "var(--ed-gradient)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverFor(c)}
          alt={c.title}
          loading="lazy"
          className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(14,30,43,0.10) 0%, rgba(14,30,43,0.55) 100%)",
          }}
        />
        <span
          className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ color: "var(--ed-ink)" }}
        >
          {TIER_LABEL[c.tier]}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--ed-blue)" }}
        >
          {c.instituteName}
        </div>
        <h3
          className="mt-1 line-clamp-2 text-sm font-bold leading-snug"
          style={{ color: "var(--ed-ink)" }}
        >
          {c.title}
        </h3>
        {c.tagline && (
          <p
            className="mt-1 line-clamp-2 text-xs"
            style={{ color: "var(--ed-mute)" }}
          >
            {c.tagline}
          </p>
        )}
        <div
          className="mt-3 flex items-center justify-between border-t pt-3"
          style={{ borderColor: "var(--ed-line)" }}
        >
          <span
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: "var(--ed-warn)" }}
          >
            <Star className="size-3.5 fill-current" /> 4.8
          </span>
          <span
            className="text-base font-extrabold"
            style={{ color: "var(--ed-ink)" }}
          >
            {c.priceCents === 0
              ? "Free"
              : formatCurrency(c.priceCents, c.currency)}
            {c.type === "subscription" && c.priceCents > 0 && (
              <span
                className="text-[11px] font-medium"
                style={{ color: "var(--ed-mute)" }}
              >
                {" "}
                /mo
              </span>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
