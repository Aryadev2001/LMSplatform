import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
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
  ClipboardList,
  Globe,
  Hourglass,
  Sparkles,
  Hammer,
  MessageSquare,
} from "lucide-react";
import { db } from "@/db/client";
import { tenants, exams } from "@/db/schema";
import { getCourseBySlug, formatRuntime } from "@/lib/courses";
import { getRelatedCourses } from "@/lib/marketplace";
import { getCourseRatingDistribution, listCourseReviews } from "@/lib/reviews";
import { formatCurrency } from "@/lib/format";
import { EuroNav } from "@/components/euro/euro-nav";
import { EuroFooter } from "@/components/euro/euro-footer";
import { EuroCourseCard } from "@/components/euro/course-card";
import { AddToCartButton } from "@/components/euro/cart-button";
import { WishlistButton } from "@/components/euro/wishlist-button";

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

  const [related, [examCountRow], rating, reviews] = await Promise.all([
    getRelatedCourses(tenantId, course.id, 3),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(exams)
      .where(and(eq(exams.programId, course.id), eq(exams.isActive, true))),
    getCourseRatingDistribution(course.id),
    listCourseReviews(course.id, { limit: 8 }),
  ]);
  const examCount = examCountRow?.n ?? 0;

  const FEATURE_LABEL: Record<string, { label: string; icon: typeof Award }> = {
    certificate: { label: "Certificate of Completion", icon: Award },
    q_bank: { label: "Q-Bank & Mock Exams", icon: ClipboardList },
    hands_on: { label: "Hands-on Labs", icon: Hammer },
    mentor_qa: { label: "Mentor Q&A Sessions", icon: MessageSquare },
  };
  const LANGUAGE_LABEL: Record<string, string> = {
    en: "English",
    ar: "Arabic",
    hi: "Hindi",
  };
  const features = (Array.isArray(course.features)
    ? (course.features as unknown[]).filter(
        (f): f is string => typeof f === "string" && f in FEATURE_LABEL,
      )
    : []) as Array<keyof typeof FEATURE_LABEL>;

  const rupees = Math.floor(course.priceCents / 100);
  const referPts = Math.floor((rupees * institute.referralPct) / 100);
  const isApplication = course.requiresApplication;

  const includes = [
    { icon: Layers, label: `${modules.length} modules` },
    { icon: PlayCircle, label: `${totalLessons} lessons` },
    {
      icon: Clock,
      label:
        course.totalDurationHours > 0
          ? `${course.totalDurationHours} hours of content`
          : `${formatRuntime(totalSeconds)} of content`,
    },
    examCount > 0
      ? { icon: ClipboardList, label: `${examCount} graded exam${examCount === 1 ? "" : "s"}` }
      : null,
    { icon: Globe, label: `Taught in ${LANGUAGE_LABEL[course.language] ?? "English"}` },
    course.certificateTemplateUrl
      ? { icon: Award, label: "Verified certificate on completion" }
      : null,
    { icon: CheckCircle2, label: "Lifetime access & updates" },
  ].filter((x): x is { icon: typeof Layers; label: string } => x !== null);

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
                {rating.count > 0 && (
                  <span
                    className="inline-flex items-center gap-1"
                    style={{ color: "var(--ed-warn)" }}
                  >
                    <Star className="size-3.5 fill-current" /> {rating.avg.toFixed(1)}
                    <span style={{ color: "var(--ed-mute)" }}>({rating.count})</span>
                  </span>
                )}
              </Link>

              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm" style={{ color: "var(--ed-mute)" }}>
                <span className="flex items-center gap-1.5"><Layers className="size-4" /> {modules.length} modules</span>
                <span className="flex items-center gap-1.5"><PlayCircle className="size-4" /> {totalLessons} lessons</span>
                <span className="flex items-center gap-1.5">
                  <Hourglass className="size-4" />{" "}
                  {course.totalDurationHours > 0
                    ? `${course.totalDurationHours} hr`
                    : formatRuntime(totalSeconds)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Globe className="size-4" />
                  {LANGUAGE_LABEL[course.language] ?? "English"}
                </span>
                {examCount > 0 && (
                  <span className="flex items-center gap-1.5">
                    <ClipboardList className="size-4" />
                    {examCount} exam{examCount === 1 ? "" : "s"}
                  </span>
                )}
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
                  className="relative h-40 overflow-hidden"
                  style={{ background: "var(--ed-gradient)" }}
                >
                  {course.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.imageUrl}
                      alt={course.name}
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{ background: "var(--ed-halftone)" }}
                    />
                  )}
                  {course.introVideoUrl ? (
                    <a
                      href={course.introVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Watch intro video"
                      className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/40"
                    >
                      <span className="flex size-14 items-center justify-center rounded-full bg-white/95 shadow-lg">
                        <PlayCircle
                          className="size-7 fill-current"
                          style={{ color: "var(--ed-ink)" }}
                        />
                      </span>
                      <span className="absolute bottom-3 left-3 rounded-md bg-black/65 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                        Intro video
                      </span>
                    </a>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <PlayCircle className="size-12 text-white/70" />
                    </div>
                  )}
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
                  {!isApplication && (
                    <div className="mt-2">
                      <AddToCartButton
                        item={{
                          programId: course.id,
                          slug: course.slug,
                          title: course.name,
                          priceCents: course.priceCents,
                          currency: course.currency,
                          instituteSlug: institute.slug,
                          instituteName: institute.name,
                        }}
                      />
                      <div className="mt-2">
                        <WishlistButton
                          item={{
                            programId: course.id,
                            slug: course.slug,
                            title: course.name,
                            priceCents: course.priceCents,
                            currency: course.currency,
                            instituteSlug: institute.slug,
                            instituteName: institute.name,
                          }}
                        />
                      </div>
                    </div>
                  )}
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
          {/* What's included — features pulled from course.features (0013) */}
          {features.length > 0 && (
            <section>
              <h2
                className="mb-4 text-xl font-extrabold tracking-tight"
                style={{ color: "var(--ed-ink)" }}
              >
                What&apos;s included
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {features.map((f) => {
                  const def = FEATURE_LABEL[f];
                  return (
                    <div
                      key={f}
                      className="flex items-start gap-3 rounded-2xl border bg-white p-4"
                      style={{ borderColor: "var(--ed-line)" }}
                    >
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          background: "rgba(141,198,63,0.12)",
                          color: "var(--ed-green-dark, #4f7f1c)",
                        }}
                      >
                        <def.icon className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <div
                          className="text-sm font-bold"
                          style={{ color: "var(--ed-ink)" }}
                        >
                          {def.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Exam call-out — surfaces graded assessments */}
          {examCount > 0 && (
            <section
              className="flex items-start gap-4 rounded-2xl border p-5"
              style={{
                borderColor: "var(--ed-line)",
                background: "rgba(0,174,239,0.06)",
              }}
            >
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "var(--ed-blue)", color: "white" }}
              >
                <ClipboardList className="size-5" />
              </span>
              <div className="min-w-0">
                <div
                  className="text-sm font-extrabold"
                  style={{ color: "var(--ed-ink)" }}
                >
                  {examCount} graded exam{examCount === 1 ? "" : "s"} included
                </div>
                <p
                  className="mt-0.5 text-xs"
                  style={{ color: "var(--ed-ink-2)" }}
                >
                  Test your understanding with timed multiple-choice exams.
                  Pass to validate your learning and unlock your certificate.
                </p>
              </div>
            </section>
          )}

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

          {/* Reviews — real list from course_reviews (0016) */}
          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2
                  className="text-xl font-extrabold tracking-tight"
                  style={{ color: "var(--ed-ink)" }}
                >
                  Reviews
                </h2>
                {rating.count > 0 && (
                  <div
                    className="mt-1 text-sm font-semibold"
                    style={{ color: "var(--ed-mute)" }}
                  >
                    {rating.avg.toFixed(1)} / 5 from {rating.count} review
                    {rating.count === 1 ? "" : "s"}
                  </div>
                )}
              </div>
              {rating.count > 0 && (
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`size-4 ${rating.avg >= n - 0.5 ? "fill-current" : ""}`}
                      style={{
                        color:
                          rating.avg >= n - 0.5
                            ? "var(--ed-warn)"
                            : "var(--ed-line)",
                      }}
                      strokeWidth={1.5}
                    />
                  ))}
                </div>
              )}
            </div>

            {rating.count > 0 && (
              <div
                className="mb-6 rounded-2xl border bg-white p-5"
                style={{ borderColor: "var(--ed-line)" }}
              >
                <div className="grid items-center gap-6 sm:grid-cols-[160px_1fr]">
                  <div className="text-center">
                    <div
                      className="text-5xl font-extrabold tracking-tight"
                      style={{ color: "var(--ed-ink)" }}
                    >
                      {rating.avg.toFixed(1)}
                    </div>
                    <div className="mt-1 flex justify-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`size-3.5 ${rating.avg >= n - 0.5 ? "fill-current" : ""}`}
                          style={{
                            color:
                              rating.avg >= n - 0.5
                                ? "var(--ed-warn)"
                                : "var(--ed-line)",
                          }}
                          strokeWidth={1.5}
                        />
                      ))}
                    </div>
                    <div
                      className="mt-1 text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: "var(--ed-mute)" }}
                    >
                      {rating.count} review{rating.count === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {([5, 4, 3, 2, 1] as const).map((stars) => {
                      const n = rating.dist[5 - stars];
                      const pct = rating.count > 0 ? (n / rating.count) * 100 : 0;
                      return (
                        <div key={stars} className="flex items-center gap-3">
                          <span
                            className="w-8 text-xs tabular-nums"
                            style={{ color: "var(--ed-ink-2)" }}
                          >
                            {stars}★
                          </span>
                          <div
                            className="relative h-2 flex-1 overflow-hidden rounded-full"
                            style={{ background: "var(--ed-line)" }}
                          >
                            <div
                              className="absolute inset-y-0 left-0 rounded-full"
                              style={{
                                width: `${pct}%`,
                                background: "var(--ed-warn)",
                              }}
                            />
                          </div>
                          <span
                            className="w-10 text-right text-xs tabular-nums"
                            style={{ color: "var(--ed-mute)" }}
                          >
                            {n}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {reviews.length === 0 ? (
              <div
                className="rounded-2xl border border-dashed py-10 text-center text-sm"
                style={{ borderColor: "var(--ed-line)", color: "var(--ed-mute)" }}
              >
                No reviews yet — enrolled students can leave a review from
                their course dashboard.
              </div>
            ) : (
              <ul
                className="divide-y rounded-2xl border bg-white"
                style={{ borderColor: "var(--ed-line)" }}
              >
                {reviews.map((r) => (
                  <li key={r.id} className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`size-3.5 ${r.rating >= n ? "fill-current" : ""}`}
                            style={{
                              color:
                                r.rating >= n
                                  ? "var(--ed-warn)"
                                  : "var(--ed-line)",
                            }}
                            strokeWidth={1.5}
                          />
                        ))}
                      </div>
                      <span
                        className="text-sm font-bold"
                        style={{ color: "var(--ed-ink)" }}
                      >
                        {r.authorName ?? "Verified learner"}
                      </span>
                      <span
                        className="text-[11px]"
                        style={{ color: "var(--ed-mute)" }}
                      >
                        {r.createdAt.toISOString().slice(0, 10)}
                      </span>
                    </div>
                    {r.body && (
                      <p
                        className="mt-2 whitespace-pre-line text-sm"
                        style={{ color: "var(--ed-ink-2)" }}
                      >
                        {r.body}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Disclaimer + T&C — surfaces course.disclaimer + course.termsHtml */}
          {(course.disclaimer || course.termsHtml) && (
            <section>
              <h2
                className="mb-3 text-xl font-extrabold tracking-tight"
                style={{ color: "var(--ed-ink)" }}
              >
                Disclaimer &amp; terms
              </h2>
              <div className="space-y-3">
                {course.disclaimer && (
                  <details
                    className="group rounded-2xl border bg-white px-5 py-4"
                    style={{ borderColor: "var(--ed-line)" }}
                  >
                    <summary
                      className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold"
                      style={{ color: "var(--ed-ink)" }}
                    >
                      Disclaimer
                      <ChevronDown
                        className="size-4 transition-transform group-open:rotate-180"
                        style={{ color: "var(--ed-mute)" }}
                      />
                    </summary>
                    <p
                      className="mt-2 whitespace-pre-line text-sm leading-relaxed"
                      style={{ color: "var(--ed-mute)" }}
                    >
                      {course.disclaimer}
                    </p>
                  </details>
                )}
                {course.termsHtml && (
                  <details
                    className="group rounded-2xl border bg-white px-5 py-4"
                    style={{ borderColor: "var(--ed-line)" }}
                  >
                    <summary
                      className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold"
                      style={{ color: "var(--ed-ink)" }}
                    >
                      Terms &amp; conditions
                      <ChevronDown
                        className="size-4 transition-transform group-open:rotate-180"
                        style={{ color: "var(--ed-mute)" }}
                      />
                    </summary>
                    <div
                      className="mt-2 whitespace-pre-line text-sm leading-relaxed"
                      style={{ color: "var(--ed-mute)" }}
                    >
                      {course.termsHtml}
                    </div>
                  </details>
                )}
              </div>
            </section>
          )}

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
