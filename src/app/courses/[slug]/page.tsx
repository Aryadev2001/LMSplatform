import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import {
  PlayCircle,
  FileText,
  Clock,
  Layers,
  CheckCircle2,
  Award,
  Star,
  ChevronDown,
  ArrowRight,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { db } from "@/db/client";
import { tenants } from "@/db/schema";
import { getCourseBySlug, formatRuntime } from "@/lib/courses";
import { getRelatedCourses } from "@/lib/marketplace";
import { formatCurrency } from "@/lib/format";
import { EuroNav } from "@/components/euro/euro-nav";
import { EuroFooter } from "@/components/euro/euro-footer";
import { EuroCourseCard } from "@/components/euro/course-card";

export const dynamic = "force-dynamic";

const TIER_LABEL = { low: "Beginner", mid: "Intermediate", high: "Advanced" } as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getCourseBySlug(slug);
  return {
    title: data
      ? `${data.course.name} — eurodigital.coach`
      : "Course — eurodigital.coach",
    description: data?.course.tagline ?? undefined,
  };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getCourseBySlug(slug);

  // Public marketplace page: any PUBLISHED, tenant-scoped course (master
  // courses are tenant-less + draft → excluded). Cross-tenant by design.
  if (
    !data ||
    data.course.status !== "published" ||
    !data.course.tenantId
  ) {
    notFound();
  }

  const { course, modules, totalLessons, totalSeconds } = data;
  const tenantId = course.tenantId;
  if (!tenantId) notFound();

  const [institute] = await db
    .select({
      name: tenants.name,
      slug: tenants.slug,
      logoUrl: tenants.logoUrl,
      referralPct: tenants.referralPointsPercent,
      status: tenants.status,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!institute || institute.status === "SUSPENDED") notFound();

  const related = await getRelatedCourses(tenantId, course.id, 3);

  const rupees = Math.floor(course.priceCents / 100);
  const referPts = Math.floor((rupees * institute.referralPct) / 100);
  const isApplication = course.requiresApplication;

  const includes = [
    { icon: Layers, label: `${modules.length} modules` },
    { icon: PlayCircle, label: `${totalLessons} lessons` },
    { icon: Clock, label: `${formatRuntime(totalSeconds)} of content` },
    { icon: Award, label: "Verified certificate on completion" },
    { icon: CheckCircle2, label: "Lifetime access & updates" },
  ];

  const faqs = [
    {
      q: "How do I get access after paying?",
      a: "You're enrolled instantly — a magic-link login is emailed to you, no password needed.",
    },
    {
      q: "Is there a certificate?",
      a: "Yes. Complete all modules and you unlock a verifiable certificate with a public verification link.",
    },
    {
      q: "Can I learn at my own pace?",
      a: "Absolutely. Lifetime access — start, pause and resume whenever you like.",
    },
    {
      q: "Who is this course by?",
      a: `This course is published by ${institute.name}, a verified institute on eurodigital.coach.`,
    },
  ];

  return (
    <div style={{ background: "var(--ed-bg)" }} className="min-h-screen">
      <EuroNav />

      {/* Breadcrumb + hero */}
      <section
        className="relative overflow-hidden border-b"
        style={{ borderColor: "var(--ed-line)" }}
      >
        <div className="absolute inset-0 opacity-50" style={{ background: "var(--ed-halftone)" }} />
        <div className="relative mx-auto max-w-7xl px-6 py-10">
          <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-xs font-medium" style={{ color: "var(--ed-mute)" }}>
            <Link href="/" className="hover:underline">Home</Link>
            <span>/</span>
            <Link href="/explore" className="hover:underline">Explore</Link>
            <span>/</span>
            <Link href={`/institute/${institute.slug}`} className="hover:underline">
              {institute.name}
            </Link>
            <span>/</span>
            <span style={{ color: "var(--ed-ink-2)" }}>{course.name}</span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
            {/* Left: title + meta */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white"
                  style={{ background: "var(--ed-ink)" }}
                >
                  {TIER_LABEL[course.tier]}
                </span>
                {course.type === "subscription" && (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider"
                    style={{ background: "white", color: "var(--ed-ink-2)", border: "1px solid var(--ed-line)" }}
                  >
                    Subscription
                  </span>
                )}
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider"
                  style={{ background: "white", color: "var(--ed-ink-2)", border: "1px solid var(--ed-line)" }}
                >
                  <Award className="size-3" /> Certificate
                </span>
              </div>

              <h1
                className="mt-4 text-balance text-3xl font-extrabold leading-tight tracking-tight md:text-4xl"
                style={{ color: "var(--ed-ink)" }}
              >
                {course.name}
              </h1>
              {course.tagline && (
                <p className="mt-3 text-balance md:text-lg" style={{ color: "var(--ed-mute)" }}>
                  {course.tagline}
                </p>
              )}

              <Link
                href={`/institute/${institute.slug}`}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold"
                style={{ color: "var(--ed-blue)" }}
              >
                <Building2 className="size-4" /> {institute.name}
                <span className="inline-flex items-center gap-1" style={{ color: "var(--ed-warn)" }}>
                  <Star className="size-3.5 fill-current" /> 4.8
                </span>
              </Link>

              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm" style={{ color: "var(--ed-mute)" }}>
                <span className="flex items-center gap-1.5"><Layers className="size-4" /> {modules.length} modules</span>
                <span className="flex items-center gap-1.5"><PlayCircle className="size-4" /> {totalLessons} lessons</span>
                <span className="flex items-center gap-1.5"><Clock className="size-4" /> {formatRuntime(totalSeconds)}</span>
                <span className="flex items-center gap-1.5">{course.durationMonths} month{course.durationMonths > 1 ? "s" : ""} access</span>
              </div>
            </div>

            {/* Right: sticky buy box */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div
                className="overflow-hidden rounded-2xl border bg-white shadow-sm"
                style={{ borderColor: "var(--ed-line)" }}
              >
                <div
                  className="flex h-32 items-center justify-center"
                  style={{ background: "var(--ed-gradient)" }}
                >
                  <div className="absolute inset-x-0 h-32" style={{ background: "var(--ed-halftone)" }} />
                  <PlayCircle className="relative size-10 text-white/90" />
                </div>
                <div className="p-6">
                  <div className="text-3xl font-extrabold" style={{ color: "var(--ed-ink)" }}>
                    {formatCurrency(course.priceCents, course.currency)}
                    {course.type === "subscription" && (
                      <span className="text-sm font-medium" style={{ color: "var(--ed-mute)" }}> /mo</span>
                    )}
                  </div>
                  <div className="mt-1 text-xs" style={{ color: "var(--ed-mute)" }}>
                    {isApplication ? "Application + qualification call" : "One-time payment · instant access"}
                  </div>

                  <Link
                    href={`/enroll?course=${course.slug}`}
                    className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                    style={{ background: "var(--ed-gradient)" }}
                  >
                    {isApplication ? "Apply now" : "Enroll now"}
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href="/sign-in"
                    className="mt-2 flex h-11 w-full items-center justify-center rounded-xl border text-sm font-semibold transition-colors hover:bg-[var(--ed-bg)]"
                    style={{ borderColor: "var(--ed-line)", color: "var(--ed-ink-2)" }}
                  >
                    I already have an account
                  </Link>

                  <ul className="mt-5 space-y-2.5">
                    {includes.map((it) => (
                      <li key={it.label} className="flex items-center gap-2 text-xs" style={{ color: "var(--ed-ink-2)" }}>
                        <it.icon className="size-4 shrink-0" style={{ color: "var(--ed-green)" }} />
                        {it.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Rewards card */}
              <div
                className="mt-4 rounded-2xl p-5 text-white"
                style={{ background: "var(--ed-green-dark)" }}
              >
                <div className="text-xs font-bold uppercase tracking-widest opacity-80">
                  Rewards
                </div>
                <div className="mt-2 text-sm font-semibold">
                  Refer this course & earn {institute.referralPct}% back
                </div>
                <div className="mt-1 text-xs opacity-90">
                  ≈ {referPts} reward points per referred enrollment · 1 pt = ₹1
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-14 lg:grid-cols-[1fr_360px]">
        <div className="space-y-12">
          {/* About */}
          {course.description && (
            <section>
              <h2 className="mb-3 text-xl font-extrabold tracking-tight" style={{ color: "var(--ed-ink)" }}>
                About this course
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed" style={{ color: "var(--ed-ink-2)" }}>
                {course.description}
              </p>
            </section>
          )}

          {/* Curriculum accordion */}
          <section>
            <h2 className="mb-4 text-xl font-extrabold tracking-tight" style={{ color: "var(--ed-ink)" }}>
              Curriculum · {modules.length} modules · {totalLessons} lessons
            </h2>
            <div className="space-y-3">
              {modules.length === 0 && (
                <p className="text-sm" style={{ color: "var(--ed-mute)" }}>
                  Curriculum is being finalised.
                </p>
              )}
              {modules.map((mod, i) => (
                <details
                  key={mod.id}
                  className="group overflow-hidden rounded-2xl border bg-white"
                  style={{ borderColor: "var(--ed-line)" }}
                  open={i === 0}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ed-mute)" }}>
                        Module {i + 1}
                      </div>
                      <div className="text-sm font-bold" style={{ color: "var(--ed-ink)" }}>
                        {mod.title}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs" style={{ color: "var(--ed-mute)" }}>
                        {mod.lessons.length} lessons
                      </span>
                      <ChevronDown
                        className="size-4 transition-transform group-open:rotate-180"
                        style={{ color: "var(--ed-mute)" }}
                      />
                    </div>
                  </summary>
                  <ul className="border-t" style={{ borderColor: "var(--ed-line)" }}>
                    {mod.lessons.map((l) => (
                      <li
                        key={l.id}
                        className="flex items-center justify-between px-5 py-3 text-sm"
                        style={{ borderTop: "1px solid var(--ed-line)" }}
                      >
                        <span className="flex items-center gap-2.5" style={{ color: "var(--ed-ink-2)" }}>
                          {l.videoUrl ? (
                            <PlayCircle className="size-4" style={{ color: "var(--ed-blue)" }} />
                          ) : (
                            <FileText className="size-4" style={{ color: "var(--ed-mute)" }} />
                          )}
                          {l.title}
                        </span>
                        <span className="text-xs" style={{ color: "var(--ed-mute)" }}>
                          {Math.max(1, Math.round(l.durationSeconds / 60))} min
                        </span>
                      </li>
                    ))}
                    {mod.lessons.length === 0 && (
                      <li className="px-5 py-3 text-xs" style={{ color: "var(--ed-mute)" }}>
                        Lessons coming soon.
                      </li>
                    )}
                  </ul>
                </details>
              ))}
            </div>
          </section>

          {/* Certificate */}
          <section
            className="overflow-hidden rounded-2xl p-8 text-white"
            style={{ background: "var(--ed-ink)" }}
          >
            <div className="absolute inset-0 opacity-30" style={{ background: "var(--ed-halftone)" }} />
            <div className="relative flex items-start gap-4">
              <Award className="size-9 shrink-0" style={{ color: "var(--ed-green)" }} />
              <div>
                <h3 className="text-lg font-extrabold">Verified certificate of completion</h3>
                <p className="mt-1 text-sm" style={{ color: "var(--ed-mute)" }}>
                  Finish every module and unlock a certificate with a unique ID and a
                  public verification link — shareable to LinkedIn.
                </p>
              </div>
            </div>
          </section>

          {/* Reviews — honest state (no reviews model yet) */}
          <section>
            <h2 className="mb-3 text-xl font-extrabold tracking-tight" style={{ color: "var(--ed-ink)" }}>
              Reviews
            </h2>
            <div
              className="rounded-2xl border border-dashed py-10 text-center text-sm"
              style={{ borderColor: "var(--ed-line)", color: "var(--ed-mute)" }}
            >
              No reviews yet — be the first to review after you complete this course.
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="mb-4 text-xl font-extrabold tracking-tight" style={{ color: "var(--ed-ink)" }}>
              Frequently asked
            </h2>
            <div className="space-y-3">
              {faqs.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-2xl border bg-white px-5 py-4"
                  style={{ borderColor: "var(--ed-line)" }}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold" style={{ color: "var(--ed-ink)" }}>
                    {f.q}
                    <ChevronDown className="size-4 transition-transform group-open:rotate-180" style={{ color: "var(--ed-mute)" }} />
                  </summary>
                  <p className="mt-2 text-sm" style={{ color: "var(--ed-mute)" }}>
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </section>
        </div>

        {/* Right rail: recommended */}
        <aside className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--ed-mute)" }}>
            More from {institute.name}
          </h2>
          {related.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ed-mute)" }}>
              No other courses yet.
            </p>
          ) : (
            <div className="space-y-4">
              {related.map((c) => (
                <EuroCourseCard key={c.id} c={c} />
              ))}
            </div>
          )}
        </aside>
      </div>

      <EuroFooter />
    </div>
  );
}
