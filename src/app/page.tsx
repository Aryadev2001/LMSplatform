import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { EuroNav, EURO_CATEGORIES } from "@/components/euro/euro-nav";
import { EuroFooter } from "@/components/euro/euro-footer";
import { EuroCourseCard } from "@/components/euro/course-card";
import { FloatingHero } from "@/components/euro/floating-hero";
import {
  getMarketStats,
  getMarketCourses,
  getFeaturedInstitutes,
} from "@/lib/marketplace";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "eurodigital.coach — Learn · Certify · Grow",
  description:
    "A global learning marketplace. Discover courses from verified institutes, earn verified certificates and rewards.",
};

const CAT_COLORS = [
  "var(--ed-blue)",
  "var(--ed-indigo)",
  "var(--ed-pink)",
  "var(--ed-green)",
  "var(--ed-teal)",
  "var(--ed-warn)",
];

export default async function HomePage() {
  const [stats, trending, institutes] = await Promise.all([
    getMarketStats(),
    getMarketCourses({ limit: 8 }),
    getFeaturedInstitutes(8),
  ]);

  const statTiles = [
    { value: `${stats.courses}+`, label: "COURSES" },
    { value: `${stats.institutes}+`, label: "PARTNER INSTITUTES" },
    { value: `${stats.learners}+`, label: "ACTIVE LEARNERS" },
    { value: "4.8★", label: "AVG. RATING" },
  ];

  return (
    <div style={{ background: "var(--ed-bg)" }} className="min-h-screen">
      <EuroNav />

      {/* Hero */}
      <FloatingHero
        institutes={stats.institutes}
        statTiles={statTiles}
        featuredCourses={trending.slice(0, 3)}
      />

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {EURO_CATEGORIES.map((cat, i) => (
            <Link
              key={cat.slug}
              href={`/explore?category=${cat.slug}`}
              className="rounded-2xl border bg-white p-5 transition-shadow hover:shadow-md"
              style={{ borderColor: "var(--ed-line)" }}
            >
              <div
                className="mb-3 flex size-11 items-center justify-center rounded-full"
                style={{ background: CAT_COLORS[i % CAT_COLORS.length] }}
              >
                <cat.icon className="size-5 text-white" />
              </div>
              <div className="text-sm font-bold" style={{ color: "var(--ed-ink)" }}>
                {cat.label}
              </div>
              <div className="mt-1 text-xs" style={{ color: "var(--ed-mute)" }}>
                Explore →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending */}
      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--ed-ink)" }}>
            Trending now
          </h2>
          <Link href="/explore" className="text-sm font-semibold" style={{ color: "var(--ed-blue)" }}>
            View all →
          </Link>
        </div>
        {trending.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed py-16 text-center text-sm"
            style={{ borderColor: "var(--ed-line)", color: "var(--ed-mute)" }}
          >
            No published courses yet — institutes are onboarding.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {trending.map((c) => (
              <EuroCourseCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </section>

      {/* Featured institutes */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <h2 className="mb-6 text-2xl font-extrabold tracking-tight" style={{ color: "var(--ed-ink)" }}>
          Featured institutes
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {institutes.map((inst) => (
            <Link
              key={inst.slug}
              href={`/institute/${inst.slug}`}
              className="flex items-center gap-4 rounded-2xl border bg-white p-5 transition-shadow hover:shadow-md"
              style={{ borderColor: "var(--ed-line)" }}
            >
              <div
                className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl text-white"
                style={{ background: "var(--ed-gradient)" }}
              >
                {inst.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={inst.logoUrl} alt={inst.name} className="size-full object-contain" />
                ) : (
                  <Star className="size-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold" style={{ color: "var(--ed-ink)" }}>
                  {inst.name}
                </div>
                <div className="text-xs" style={{ color: "var(--ed-mute)" }}>
                  {inst.courseCount} course{inst.courseCount === 1 ? "" : "s"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Become a Partner */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div
          className="relative overflow-hidden rounded-3xl p-10 text-center text-white md:p-14"
          style={{ background: "var(--ed-ink)" }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: "var(--ed-halftone)" }} />
          <div className="relative">
            <h2 className="text-2xl font-extrabold md:text-3xl">
              Are you an institute? Get a branded storefront in minutes.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm" style={{ color: "var(--ed-mute)" }}>
              Upload courses, set your pricing, connect your own payment
              gateway, and start enrolling learners — no code required.
            </p>
            <Link
              href="/partner-program"
              className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold"
              style={{ background: "var(--ed-gradient)" }}
            >
              See partner plans <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <EuroFooter />
    </div>
  );
}
