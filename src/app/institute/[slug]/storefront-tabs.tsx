"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Play,
  Clock,
  BookOpen,
  Award,
  Sparkles,
  ChevronDown,
  Filter,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { StorefrontCourse } from "@/lib/storefront";

interface OwnerSummary {
  name: string | null;
  title: string | null;
  profile: string | null;
  photoUrl: string | null;
}

interface StorefrontStats {
  courseCount: number;
  learnerCount: number;
  sinceYear: number;
  activeOffers: number;
}

const TABS = [
  "All Courses",
  "About the Institute",
  "Reviews",
  "Instructors",
  "Offers & Coupons",
  "FAQ",
] as const;
type Tab = (typeof TABS)[number];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price_low", label: "Price: low to high" },
  { value: "price_high", label: "Price: high to low" },
  { value: "title", label: "A → Z" },
] as const;
type SortValue = (typeof SORT_OPTIONS)[number]["value"];

const TIER_LABEL: Record<StorefrontCourse["tier"], string> = {
  low: "Beginner",
  mid: "Intermediate",
  high: "Advanced",
};

const LANGUAGE_LABEL: Record<StorefrontCourse["language"], string> = {
  en: "English",
  ar: "Arabic",
  hi: "Hindi",
};

export function StorefrontBody({
  tenantName,
  heroTagline,
  companyProfile,
  owner,
  courses,
  stats,
}: {
  tenantName: string;
  heroTagline: string | null;
  companyProfile: string | null;
  owner: OwnerSummary;
  courses: StorefrontCourse[];
  stats: StorefrontStats;
}) {
  const [tab, setTab] = useState<Tab>("All Courses");
  const [sort, setSort] = useState<SortValue>("newest");
  const [levelFilter, setLevelFilter] = useState<
    StorefrontCourse["tier"] | "all"
  >("all");

  const sortedCourses = useMemo(() => {
    const list =
      levelFilter === "all"
        ? courses
        : courses.filter((c) => c.tier === levelFilter);
    const arr = [...list];
    if (sort === "price_low") arr.sort((a, b) => a.priceCents - b.priceCents);
    else if (sort === "price_high")
      arr.sort((a, b) => b.priceCents - a.priceCents);
    else if (sort === "title")
      arr.sort((a, b) => a.title.localeCompare(b.title));
    return arr;
  }, [courses, sort, levelFilter]);

  const faqs = [
    {
      q: `Who is ${tenantName}?`,
      a: `${tenantName} is a verified institute on eurodigital.coach offering the courses listed here.`,
    },
    {
      q: "How do I enrol?",
      a: "Open any course, choose Enrol now or add it to your cart, and check out. Access is granted instantly.",
    },
    {
      q: "Do I get a certificate?",
      a: "Yes — complete all modules of a course to unlock a verifiable certificate with a public verification link.",
    },
    {
      q: "Can I learn at my own pace?",
      a: "Lifetime access — start, pause and resume any time.",
    },
  ];

  return (
    <section
      id="courses"
      className="mx-auto max-w-7xl px-6 pb-24 pt-8"
    >
      {/* Tab nav */}
      <div
        className="mb-8 flex gap-1 overflow-x-auto border-b"
        style={{ borderColor: "var(--ed-line)" }}
      >
        {TABS.map((t) => {
          const active = tab === t;
          const count =
            t === "All Courses"
              ? stats.courseCount
              : t === "Offers & Coupons"
                ? stats.activeOffers
                : null;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="relative whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors"
              style={{
                color: active ? "var(--brand-primary)" : "var(--ed-ink-2)",
              }}
            >
              {t}
              {count !== null && (
                <span
                  className="ml-1.5 text-xs"
                  style={{ color: "var(--ed-mute)" }}
                >
                  ({count})
                </span>
              )}
              {active && (
                <span
                  className="absolute inset-x-2 bottom-0 h-0.5 rounded-full"
                  style={{ background: "var(--brand-primary)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* About tab is shown first because it answers "what is this place" */}
      {tab === "About the Institute" && (
        <AboutTab
          tenantName={tenantName}
          heroTagline={heroTagline}
          companyProfile={companyProfile}
          owner={owner}
          stats={stats}
        />
      )}

      {/* All Courses */}
      {tab === "All Courses" && (
        <div>
          {/* Header row matching Image #9: "Browse N courses from X" + filter */}
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest"
                style={{
                  background: "rgba(141,198,63,0.12)",
                  color: "var(--ed-green-dark, #4f7f1c)",
                }}
              >
                ▸ All Courses
              </div>
              <h2
                className="mt-2 text-xl font-extrabold md:text-2xl"
                style={{ color: "var(--ed-ink)" }}
              >
                Browse {courses.length} courses from {tenantName}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <SelectChip
                icon={Filter}
                label="Level"
                value={levelFilter}
                onChange={(v) =>
                  setLevelFilter(v as StorefrontCourse["tier"] | "all")
                }
                options={[
                  { value: "all", label: "All levels" },
                  { value: "low", label: "Beginner" },
                  { value: "mid", label: "Intermediate" },
                  { value: "high", label: "Advanced" },
                ]}
              />
              <SelectChip
                icon={Filter}
                label="Sort"
                value={sort}
                onChange={(v) => setSort(v as SortValue)}
                options={SORT_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
              />
            </div>
          </div>

          {sortedCourses.length === 0 ? (
            <div
              className="rounded-2xl border border-dashed py-16 text-center text-sm"
              style={{ borderColor: "var(--ed-line)", color: "var(--ed-mute)" }}
            >
              No published courses yet — check back soon.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedCourses.map((c, i) => (
                <CourseCard key={c.id} c={c} accentIndex={i} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reviews — honest empty (no reviews schema yet) */}
      {tab === "Reviews" && (
        <div
          className="rounded-2xl border border-dashed py-16 text-center text-sm"
          style={{ borderColor: "var(--ed-line)", color: "var(--ed-mute)" }}
        >
          No reviews yet — learners can review after completing a course.
        </div>
      )}

      {/* Instructors — populated from owner profile if present */}
      {tab === "Instructors" && (
        <InstructorsTab owner={owner} tenantName={tenantName} />
      )}

      {/* Offers & Coupons — schema exists in course_offers; UI for partners
          to manage them is not built yet, so we surface the count and the
          honest "ask the institute" state. */}
      {tab === "Offers & Coupons" && (
        <div
          id="offers"
          className="rounded-2xl border p-6 text-center"
          style={{ borderColor: "var(--ed-line)" }}
        >
          {stats.activeOffers === 0 ? (
            <p
              className="text-sm"
              style={{ color: "var(--ed-mute)" }}
            >
              No active offers right now.
            </p>
          ) : (
            <p
              className="text-sm"
              style={{ color: "var(--ed-ink-2)" }}
            >
              {tenantName} has <strong>{stats.activeOffers}</strong> active
              offer{stats.activeOffers === 1 ? "" : "s"}. Open a course to see
              voucher codes and reward terms.
            </p>
          )}
        </div>
      )}

      {/* FAQ */}
      {tab === "FAQ" && (
        <div className="max-w-2xl space-y-3">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border bg-white px-5 py-4"
              style={{ borderColor: "var(--ed-line)" }}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                {f.q}
                <span className="text-muted-foreground transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm" style={{ color: "var(--ed-mute)" }}>
                {f.a}
              </p>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

function AboutTab({
  tenantName,
  heroTagline,
  companyProfile,
  owner,
  stats,
}: {
  tenantName: string;
  heroTagline: string | null;
  companyProfile: string | null;
  owner: OwnerSummary;
  stats: StorefrontStats;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      {/* Intro video placeholder — replaced with a real player once tenant
          intro_video_url lands on the schema. We show a dark card with the
          play icon so the layout doesn't shift when video is added. */}
      <div
        className="relative aspect-video w-full overflow-hidden rounded-2xl"
        style={{ background: "var(--ed-ink)" }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "repeating-linear-gradient(135deg, transparent 0 14px, rgba(255,255,255,0.05) 14px 16px)",
          }}
        />
        <span
          className="absolute left-4 top-4 rounded-md bg-white/95 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider"
          style={{ color: "var(--ed-ink)" }}
        >
          Institute Intro Video
        </span>
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-white/95 shadow-lg">
            <Play
              className="size-6 translate-x-[2px] fill-current"
              style={{ color: "var(--ed-ink)" }}
            />
          </span>
        </span>
        <span
          className="absolute bottom-4 right-4 rounded-md bg-black/65 px-2 py-1 text-[10px] font-bold text-white"
        >
          —
        </span>
      </div>

      <div>
        <h2
          className="text-lg font-extrabold md:text-xl"
          style={{ color: "var(--ed-ink)" }}
        >
          About {tenantName} on eurodigital.coach
        </h2>
        <div
          className="mt-3 space-y-3 text-sm leading-relaxed"
          style={{ color: "var(--ed-ink-2)" }}
        >
          {heroTagline && <p>{heroTagline}</p>}
          {companyProfile ? (
            <p className="whitespace-pre-wrap">{companyProfile}</p>
          ) : (
            <p style={{ color: "var(--ed-mute)" }}>
              The institute hasn&apos;t added a longer profile yet.
            </p>
          )}
          {owner.name && (
            <p>
              <strong>Led by {owner.name}</strong>
              {owner.title ? ` — ${owner.title}` : ""}.
            </p>
          )}
        </div>

        {/* Metric tiles — only the metrics we actually compute. */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <MetricTile
            value={String(stats.courseCount)}
            label="Total courses"
          />
          <MetricTile
            value={String(stats.learnerCount)}
            label="Enrolled learners"
          />
          <MetricTile
            value={`Est. ${stats.sinceYear}`}
            label="On the platform"
          />
          <MetricTile
            value={String(stats.activeOffers)}
            label="Active offers"
          />
        </div>
      </div>
    </div>
  );
}

function InstructorsTab({
  owner,
  tenantName,
}: {
  owner: OwnerSummary;
  tenantName: string;
}) {
  if (!owner.name) {
    return (
      <div
        className="rounded-2xl border border-dashed py-16 text-center text-sm"
        style={{ borderColor: "var(--ed-line)", color: "var(--ed-mute)" }}
      >
        {tenantName} hasn&apos;t added instructor profiles yet.
      </div>
    );
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <div
        className="rounded-2xl border bg-white p-5"
        style={{ borderColor: "var(--ed-line)" }}
      >
        <div className="flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-secondary/40">
            {owner.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={owner.photoUrl}
                alt={owner.name}
                className="size-full object-cover"
              />
            ) : (
              <span
                className="text-lg font-extrabold"
                style={{ color: "var(--ed-mute)" }}
              >
                {owner.name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((s) => s[0])
                  .join("")}
              </span>
            )}
          </div>
          <div>
            <div className="text-sm font-extrabold" style={{ color: "var(--ed-ink)" }}>
              {owner.name}
            </div>
            {owner.title && (
              <div className="text-xs" style={{ color: "var(--ed-mute)" }}>
                {owner.title}
              </div>
            )}
          </div>
        </div>
        {owner.profile && (
          <p
            className="mt-3 line-clamp-5 text-xs leading-relaxed"
            style={{ color: "var(--ed-ink-2)" }}
          >
            {owner.profile}
          </p>
        )}
      </div>
    </div>
  );
}

function MetricTile({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="rounded-xl border p-3"
      style={{ borderColor: "var(--ed-line)" }}
    >
      <div
        className="text-2xl font-extrabold tracking-tight"
        style={{ color: "var(--brand-primary)" }}
      >
        {value}
      </div>
      <div
        className="text-[10px] font-bold uppercase tracking-widest"
        style={{ color: "var(--ed-mute)" }}
      >
        {label}
      </div>
    </div>
  );
}

const CARD_ACCENTS = [
  { tag: "INTRO VIDEO", bg: "linear-gradient(160deg, #1AADE0 0%, #0F8AB8 100%)", hasPlay: true },
  { tag: "THUMBNAIL", bg: "linear-gradient(160deg, #6E5FC9 0%, #4838B1 100%)", hasPlay: false },
  { tag: "INTRO VIDEO", bg: "linear-gradient(160deg, #F6A23C 0%, #E37D0F 100%)", hasPlay: true },
  { tag: "THUMBNAIL", bg: "linear-gradient(160deg, #1ABC9C 0%, #149174 100%)", hasPlay: false },
] as const;

function CourseCard({
  c,
  accentIndex,
}: {
  c: StorefrontCourse;
  accentIndex: number;
}) {
  const accent =
    c.introVideoUrl
      ? CARD_ACCENTS[accentIndex % 2 === 0 ? 0 : 2]
      : CARD_ACCENTS[accentIndex % CARD_ACCENTS.length];
  const href = c.slug ? `/courses/${c.slug}` : "/sign-in";
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-white transition-shadow hover:shadow-lg"
      style={{ borderColor: "var(--ed-line)" }}
    >
      <div
        className="relative h-40 overflow-hidden"
        style={{ background: accent.bg }}
      >
        {c.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.imageUrl}
            alt={c.title}
            className="absolute inset-0 size-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <span
          className="absolute left-3 top-3 rounded-md bg-white/95 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider"
          style={{ color: "var(--ed-ink)" }}
        >
          {accent.tag}
        </span>
        {accent.hasPlay && !c.imageUrl && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-white/95 shadow-lg">
              <Play
                className="size-4 translate-x-[1px] fill-current"
                style={{ color: "var(--ed-ink)" }}
              />
            </span>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
          <span
            className="rounded-full px-2 py-0.5"
            style={{
              background: "rgba(0,174,239,0.10)",
              color: "var(--ed-blue)",
            }}
          >
            {TIER_LABEL[c.tier]}
          </span>
          <span style={{ color: "var(--ed-mute)" }}>·</span>
          <span style={{ color: "var(--ed-mute)" }}>
            {LANGUAGE_LABEL[c.language]}
          </span>
        </div>
        <h3
          className="line-clamp-2 text-sm font-extrabold leading-snug"
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
          className="mt-3 flex items-center gap-3 text-[11px]"
          style={{ color: "var(--ed-mute)" }}
        >
          <span className="inline-flex items-center gap-1">
            <BookOpen className="size-3.5" />
            {c.moduleCount} mod{c.moduleCount === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {c.totalDurationHours > 0
              ? `${c.totalDurationHours} hr`
              : `${c.durationMonths} mo`}
          </span>
        </div>
        <div
          className="mt-3 flex items-center justify-between border-t pt-3"
          style={{ borderColor: "var(--ed-line)" }}
        >
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
                /mo
              </span>
            )}
          </span>
          <span
            className="inline-flex items-center gap-1 text-[11px] font-bold"
            style={{ color: "var(--brand-primary)" }}
          >
            <Sparkles className="size-3.5" />
            Enrol
          </span>
        </div>
      </div>
    </Link>
  );
}

function SelectChip({
  icon: Icon,
  label,
  value,
  onChange,
  options,
}: {
  icon: typeof Filter;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <label className="sr-only">{label}</label>
      <div
        className="flex h-9 items-center gap-1.5 rounded-xl border bg-white pl-3 pr-1 text-xs font-semibold"
        style={{ borderColor: "var(--ed-line)" }}
      >
        <Icon className="size-3.5" style={{ color: "var(--ed-mute)" }} />
        <span style={{ color: "var(--ed-mute)" }}>{label}:</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none bg-transparent pr-5 text-xs font-bold outline-none"
          style={{ color: "var(--ed-ink)" }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none -ml-4 size-3"
          style={{ color: "var(--ed-mute)" }}
        />
        <span className="w-1" aria-hidden />
        {/* keep Award + others reserved for future */}
        <span className="hidden">
          <Award className="size-3" />
        </span>
      </div>
    </div>
  );
}
