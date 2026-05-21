import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { diagnosticSubmissions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Brand } from "@/components/brand";
import { buttonVariants } from "@/components/ui/button";
import { STAGE_META, type LayerScore, type Stage } from "@/lib/diagnostic/scoring";
import { ArrowRight, Target } from "lucide-react";

export const dynamic = "force-dynamic";

const COURSE_META: Record<string, { name: string; price: string; tagline: string }> = {
  "business-x-ray": {
    name: "Business X-Ray™",
    price: "₹99",
    tagline: "The 3-Day Business Diagnosis Sprint",
  },
  "business-acceleration-engine": {
    name: "Business Acceleration Engine™",
    price: "₹9,999",
    tagline: "60-Day Done-With-You Systems Installation",
  },
  "ceo-command-centre": {
    name: "CEO Command Centre™",
    price: "₹49,999",
    tagline: "90-Day Business Transformation Program",
  },
};

export default async function DiagnosticResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [sub] = await db
    .select()
    .from(diagnosticSubmissions)
    .where(eq(diagnosticSubmissions.id, id))
    .limit(1);
  if (!sub) notFound();

  const layerScores = sub.layerScores as LayerScore[];
  const bottlenecks = sub.topBottlenecks as LayerScore[];
  const stage = sub.stage as Stage;
  const bhs = sub.businessHealthScore;
  const stageMeta = STAGE_META[stage];
  const course = sub.recommendedCourseSlug
    ? COURSE_META[sub.recommendedCourseSlug]
    : null;

  // Gauge geometry
  const r = 70;
  const circ = 2 * Math.PI * r;
  const dash = (bhs / 100) * circ;

  return (
    <div className="relative isolate min-h-screen bg-secondary/20 px-6 py-10">
      <div className="absolute inset-0 -z-10 bg-grid-soft" />
      <div className="mx-auto max-w-4xl">
        <Link href="/">
          <Brand />
        </Link>

        <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Score gauge */}
          <div className="flex flex-col items-center rounded-2xl bg-card p-6 text-center shadow-soft">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Business Health Score
            </div>
            <div className="relative mt-4">
              <svg width="180" height="180" viewBox="0 0 180 180">
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#8CC63F" />
                    <stop offset="1" stopColor="#1AADE0" />
                  </linearGradient>
                </defs>
                <circle cx="90" cy="90" r={r} fill="none" stroke="#E2E8F0" strokeWidth="12" />
                <circle
                  cx="90"
                  cy="90"
                  r={r}
                  fill="none"
                  stroke="url(#g)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circ}`}
                  transform="rotate(-90 90 90)"
                />
                <text
                  x="90"
                  y="84"
                  textAnchor="middle"
                  className="fill-foreground"
                  style={{ fontSize: 40, fontWeight: 700 }}
                >
                  {bhs}
                </text>
                <text
                  x="90"
                  y="108"
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  style={{ fontSize: 12 }}
                >
                  out of 100
                </text>
              </svg>
            </div>
            <div
              className="mt-4 rounded-full px-3 py-1 text-xs font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #8CC63F 0%, #1AADE0 100%)" }}
            >
              {stageMeta.label} stage
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{stageMeta.blurb}</p>
          </div>

          {/* Layer breakdown */}
          <div className="rounded-2xl bg-card p-6 shadow-soft">
            <h2 className="text-lg font-semibold tracking-tight">Your 7-layer breakdown</h2>
            <div className="mt-4 space-y-3">
              {layerScores.map((l) => (
                <div key={l.layerId}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium">{l.title}</span>
                    <span className="tabular-nums text-muted-foreground">{l.score}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${l.score}%`,
                        background:
                          l.score < 40
                            ? "#F59E0B"
                            : l.score < 70
                              ? "#1AADE0"
                              : "#8CC63F",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottlenecks */}
        <div className="mt-6 rounded-2xl bg-card p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <Target className="size-5 text-[#1AADE0]" />
            <h2 className="text-lg font-semibold tracking-tight">
              Your top 3 priority bottlenecks
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Fix these first — they&apos;re dragging your score down the most.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {bottlenecks.map((b, i) => (
              <div key={b.layerId} className="rounded-xl bg-secondary/40 p-4">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Priority {i + 1}
                </div>
                <div className="mt-1 text-sm font-semibold">{b.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{b.blurb}</div>
                <div className="mt-2 text-xs font-medium text-[#F59E0B]">
                  Score: {b.score}/100
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendation */}
        {course && (
          <div
            className="mt-6 overflow-hidden rounded-2xl p-8 text-white shadow-soft"
            style={{ background: "linear-gradient(135deg, #8CC63F 0%, #1AADE0 100%)" }}
          >
            <div className="text-[10px] uppercase tracking-widest text-white/70">
              Recommended for you
            </div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">{course.name}</h2>
            <p className="mt-1 text-sm text-white/80">{course.tagline}</p>
            <p className="mt-3 max-w-xl text-sm text-white/90">{/* reason */}</p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <span className="text-3xl font-bold">{course.price}</span>
              <Link
                href={`/enroll?course=${sub.recommendedCourseSlug}`}
                className={buttonVariants({
                  className:
                    "group h-11 rounded-xl bg-white px-6 text-sm text-[#0F172A] hover:bg-white/90",
                })}
              >
                Get started
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Report for {sub.name ?? sub.email} · saved {new Date(sub.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
