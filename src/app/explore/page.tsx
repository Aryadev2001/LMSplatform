import { EuroNav, EURO_CATEGORIES } from "@/components/euro/euro-nav";
import { EuroFooter } from "@/components/euro/euro-footer";
import { EuroCourseCard } from "@/components/euro/course-card";
import { getMarketCourses } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Explore courses — eurodigital.coach",
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  const courses = await getMarketCourses({ q, limit: 60 });
  const cat = EURO_CATEGORIES.find((c) => c.slug === category);

  return (
    <div style={{ background: "var(--ed-bg)" }} className="min-h-screen">
      <EuroNav />

      <section
        className="relative overflow-hidden border-b"
        style={{ borderColor: "var(--ed-line)" }}
      >
        <div className="absolute inset-0 opacity-50" style={{ background: "var(--ed-halftone)" }} />
        <div className="relative mx-auto max-w-7xl px-6 py-12">
          <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--ed-blue)" }}>
            {cat ? cat.label : q ? "Search results" : "Browse all"}
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl" style={{ color: "var(--ed-ink)" }}>
            {q ? `“${q}”` : cat ? cat.label : "Explore the marketplace"}
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--ed-mute)" }}>
            {courses.length} course{courses.length === 1 ? "" : "s"} from verified institutes.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        {/* Category chips */}
        <div className="mb-8 flex flex-wrap gap-2">
          {EURO_CATEGORIES.map((c) => (
            <a
              key={c.slug}
              href={`/explore?category=${c.slug}`}
              className="rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors"
              style={{
                borderColor: "var(--ed-line)",
                background: category === c.slug ? "var(--ed-ink)" : "white",
                color: category === c.slug ? "white" : "var(--ed-ink-2)",
              }}
            >
              {c.label}
            </a>
          ))}
        </div>

        {courses.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed py-20 text-center text-sm"
            style={{ borderColor: "var(--ed-line)", color: "var(--ed-mute)" }}
          >
            No courses match{q ? ` “${q}”` : ""} yet.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {courses.map((c) => (
              <EuroCourseCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </section>

      <EuroFooter />
    </div>
  );
}
