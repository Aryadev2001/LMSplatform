import { EuroNav, EURO_CATEGORIES } from "@/components/euro/euro-nav";
import { EuroFooter } from "@/components/euro/euro-footer";
import { EuroCourseCard } from "@/components/euro/course-card";
import { ExploreFilters } from "@/components/euro/explore-filters";
import {
  getMarketCourses,
  type CourseLevel,
  type CoursePriceBucket,
  type CourseDurationBucket,
  type MarketCourse,
} from "@/lib/marketplace";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Explore courses — eurodigital.coach",
};

const LEVEL_VALUES: CourseLevel[] = ["low", "mid", "high"];
const PRICE_VALUES: CoursePriceBucket[] = ["free", "paid", "under50", "50_200"];
const DURATION_VALUES: CourseDurationBucket[] = [
  "0_3",
  "3_6",
  "6_12",
  "12_plus",
];

const LEVEL_LABEL: Record<CourseLevel, string> = {
  low: "Beginner",
  mid: "Intermediate",
  high: "Advanced",
};

const PRICE_LABEL: Record<CoursePriceBucket, string> = {
  free: "Free",
  paid: "Paid",
  under50: "Under $50",
  "50_200": "$50 – $200",
};

const DURATION_LABEL: Record<CourseDurationBucket, string> = {
  "0_3": "0 – 3 months",
  "3_6": "3 – 6 months",
  "6_12": "6 – 12 months",
  "12_plus": "12+ months",
};

function parseMulti<T extends string>(raw: string | undefined, allowed: T[]): T[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is T => (allowed as string[]).includes(s));
}

function priceMatches(c: MarketCourse, bucket: CoursePriceBucket): boolean {
  if (bucket === "free") return c.priceCents === 0;
  if (bucket === "paid") return c.priceCents > 0;
  if (bucket === "under50") return c.priceCents > 0 && c.priceCents <= 5000;
  if (bucket === "50_200") return c.priceCents >= 5000 && c.priceCents <= 20000;
  return false;
}

function durationMatches(
  durationMonths: number,
  bucket: CourseDurationBucket,
): boolean {
  if (bucket === "0_3") return durationMonths <= 3;
  if (bucket === "3_6") return durationMonths >= 4 && durationMonths <= 6;
  if (bucket === "6_12") return durationMonths >= 7 && durationMonths <= 12;
  if (bucket === "12_plus") return durationMonths >= 13;
  return false;
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    level?: string;
    price?: string;
    duration?: string;
    welcome?: string;
  }>;
}) {
  const sp = await searchParams;
  const isWelcome = sp.welcome === "1";
  const levels = parseMulti<CourseLevel>(sp.level, LEVEL_VALUES);
  const prices = parseMulti<CoursePriceBucket>(sp.price, PRICE_VALUES);
  const durations = parseMulti<CourseDurationBucket>(sp.duration, DURATION_VALUES);

  // Fetch the q-matching universe ONCE, derive both the filtered grid and
  // the facet counts from it. One DB round-trip; counts are accurate vs the
  // current search context but not narrowing-aware (a common UX trade-off).
  const universe = await getMarketCourses({ q: sp.q, limit: 200 });

  // We can't query durationMonths from the marketplace shape — extend type
  // for counting via the raw program duration. Pull a parallel slim list.
  // For simplicity, we treat durationMonths via a side query.
  const durationByCourseId = new Map<string, number>();
  if (universe.length > 0) {
    const { db } = await import("@/db/client");
    const { programs } = await import("@/db/schema");
    const { inArray } = await import("drizzle-orm");
    const rows = await db
      .select({ id: programs.id, durationMonths: programs.durationMonths })
      .from(programs)
      .where(
        inArray(
          programs.id,
          universe.map((c) => c.id),
        ),
      );
    for (const r of rows) durationByCourseId.set(r.id, r.durationMonths);
  }

  const filtered = universe.filter((c) => {
    if (levels.length > 0 && !levels.includes(c.tier)) return false;
    if (prices.length > 0 && !prices.some((p) => priceMatches(c, p))) return false;
    if (durations.length > 0) {
      const months = durationByCourseId.get(c.id) ?? 0;
      if (!durations.some((d) => durationMatches(months, d))) return false;
    }
    return true;
  });

  const cat = EURO_CATEGORIES.find((c) => c.slug === sp.category);

  const levelOptions = LEVEL_VALUES.map((v) => ({
    value: v,
    label: LEVEL_LABEL[v],
    count: universe.filter((c) => c.tier === v).length,
  }));
  const priceOptions = PRICE_VALUES.map((v) => ({
    value: v,
    label: PRICE_LABEL[v],
    count: universe.filter((c) => priceMatches(c, v)).length,
  }));
  const durationOptions = DURATION_VALUES.map((v) => ({
    value: v,
    label: DURATION_LABEL[v],
    count: universe.filter((c) =>
      durationMatches(durationByCourseId.get(c.id) ?? 0, v),
    ).length,
  }));

  return (
    <div style={{ background: "var(--ed-bg)" }} className="min-h-screen">
      <EuroNav />

      {isWelcome && (
        <section
          className="border-b"
          style={{
            borderColor: "var(--ed-line)",
            background:
              "linear-gradient(135deg, rgba(141,198,63,0.10) 0%, rgba(0,174,239,0.10) 100%)",
          }}
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div
                className="text-[10px] font-extrabold uppercase tracking-widest"
                style={{ color: "var(--ed-green-dark, #4f7f1c)" }}
              >
                ✓ Profile complete — last step
              </div>
              <div
                className="mt-1 text-sm font-bold"
                style={{ color: "var(--ed-ink)" }}
              >
                Pick your first course to unlock the learner dashboard.
              </div>
              <p
                className="mt-0.5 text-xs"
                style={{ color: "var(--ed-ink-2)" }}
              >
                Browse below, enroll in any course, and your full dashboard
                (My Courses, Reviews, Certificates) opens up automatically.
              </p>
            </div>
          </div>
        </section>
      )}

      <section
        className="relative overflow-hidden border-b"
        style={{ borderColor: "var(--ed-line)" }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-50" style={{ background: "var(--ed-halftone)" }} />
        <div className="relative mx-auto max-w-7xl px-6 py-12">
          <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--ed-blue)" }}>
            {cat ? cat.label : sp.q ? "Search results" : "Browse all"}
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl" style={{ color: "var(--ed-ink)" }}>
            {sp.q ? `“${sp.q}”` : cat ? cat.label : "Explore the marketplace"}
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--ed-mute)" }}>
            {filtered.length} course{filtered.length === 1 ? "" : "s"} from verified institutes.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {/* Category chips */}
        <div className="mb-8 flex flex-wrap gap-2">
          {EURO_CATEGORIES.map((c) => (
            <a
              key={c.slug}
              href={`/explore?category=${c.slug}`}
              className="rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors"
              style={{
                borderColor: "var(--ed-line)",
                background: sp.category === c.slug ? "var(--ed-ink)" : "white",
                color: sp.category === c.slug ? "white" : "var(--ed-ink-2)",
              }}
            >
              {c.label}
            </a>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <ExploreFilters
            totalShown={filtered.length}
            totalAvailable={universe.length}
            active={{
              level: levels,
              price: prices,
              duration: durations,
            }}
            groups={[
              { key: "level", title: "Level", options: levelOptions },
              { key: "duration", title: "Duration", options: durationOptions },
              { key: "price", title: "Price", options: priceOptions },
            ]}
          />

          <div>
            {filtered.length === 0 ? (
              <div
                className="rounded-2xl border border-dashed py-20 text-center text-sm"
                style={{ borderColor: "var(--ed-line)", color: "var(--ed-mute)" }}
              >
                No courses match your filters{sp.q ? ` for “${sp.q}”` : ""}.
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((c) => (
                  <EuroCourseCard key={c.id} c={c} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <EuroFooter />
    </div>
  );
}
