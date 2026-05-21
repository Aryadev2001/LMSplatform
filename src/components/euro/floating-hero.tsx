"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Play, Search, Star, ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { MarketCourse } from "@/lib/marketplace";

type HeroCardStyle = "intro-blue" | "thumb-green" | "intro-dark";

interface HeroCardProps {
  course: MarketCourse | null;
  style: HeroCardStyle;
  rotate: number;
  delay: number;
  className: string;
  reviewsLabel?: string;
}

const STYLE_BG: Record<HeroCardStyle, string> = {
  "intro-blue":
    "linear-gradient(160deg, #1AADE0 0%, #0F8AB8 100%)",
  "thumb-green":
    "linear-gradient(160deg, #8CC63F 0%, #6BAA28 100%)",
  "intro-dark":
    "linear-gradient(160deg, #1F2A37 0%, #0E1E2B 100%)",
};

const STYLE_TAG: Record<HeroCardStyle, string> = {
  "intro-blue": "Intro video",
  "thumb-green": "Thumbnail",
  "intro-dark": "Intro video",
};

const STYLE_HAS_PLAY: Record<HeroCardStyle, boolean> = {
  "intro-blue": true,
  "thumb-green": false,
  "intro-dark": true,
};

function HeroCard({ course, style, rotate, delay, className, reviewsLabel }: HeroCardProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: 32, rotate: rotate - 4 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{
        delay,
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={
        reduce
          ? undefined
          : { y: -6, rotate: rotate * 0.5, transition: { duration: 0.25 } }
      }
      className={`absolute w-[260px] origin-center overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 md:w-[300px] ${className}`}
    >
      <div
        className="relative h-[150px] md:h-[170px]"
        style={{ background: STYLE_BG[style] }}
      >
        <span
          className="absolute left-3 top-3 rounded-md bg-white/95 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider"
          style={{ color: "var(--ed-ink)" }}
        >
          {STYLE_TAG[style]}
        </span>
        {STYLE_HAS_PLAY[style] && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-white/95 shadow-lg">
              <Play
                className="size-5 translate-x-[1px] fill-current"
                style={{ color: "var(--ed-ink)" }}
              />
            </span>
          </span>
        )}
      </div>
      <div className="px-4 py-3">
        <h3
          className="line-clamp-2 text-sm font-extrabold leading-snug"
          style={{ color: "var(--ed-ink)" }}
        >
          {course?.title ?? "Sample course"}
        </h3>
        <div className="mt-0.5 text-xs" style={{ color: "var(--ed-mute)" }}>
          {course?.instituteName ?? "—"}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span
            className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: "var(--ed-warn)" }}
          >
            <Star className="size-3.5 fill-current" /> 4.8
            {reviewsLabel && (
              <span className="font-normal" style={{ color: "var(--ed-mute)" }}>
                ({reviewsLabel})
              </span>
            )}
          </span>
          <span
            className="text-sm font-extrabold"
            style={{ color: "var(--ed-blue)" }}
          >
            {course
              ? course.priceCents === 0
                ? "Free"
                : formatCurrency(course.priceCents, course.currency)
              : ""}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export function FloatingHero({
  institutes,
  statTiles,
  featuredCourses,
}: {
  institutes: number;
  statTiles: { value: string; label: string }[];
  featuredCourses: MarketCourse[];
}) {
  const [c1, c2, c3] = [
    featuredCourses[0] ?? null,
    featuredCourses[1] ?? null,
    featuredCourses[2] ?? null,
  ];

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "var(--ed-ink)" }}
    >
      {/* Brand glows */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-40 size-[34rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(0,174,239,0.28) 0%, transparent 70%)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-32 -bottom-40 size-[34rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(141,198,63,0.22) 0%, transparent 70%)",
        }}
      />
      {/* Subtle grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{ background: "var(--ed-halftone)" }}
      />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-16 md:grid-cols-12 md:gap-8 md:pb-28 md:pt-20">
        {/* Left: copy + search + stats */}
        <div className="md:col-span-7 md:pt-6">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest"
            style={{
              background: "rgba(141,198,63,0.12)",
              border: "1px solid rgba(141,198,63,0.35)",
              color: "var(--ed-green)",
            }}
          >
            <ShieldCheck className="size-3.5" />
            Powered by {institutes}+ verified institutes
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="font-display mt-6 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-white md:text-[58px]"
          >
            Unlock your next chapter.
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #1AADE0 0%, #4ECBF3 100%)",
              }}
            >
              Learn
            </span>{" "}
            from the world&apos;s best.
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #8CC63F 0%, #B7E26B 100%)",
              }}
            >
              Earn
            </span>{" "}
            while you grow.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-5 max-w-xl text-balance text-sm leading-relaxed text-white/70 md:text-base"
          >
            From entrance prep to PhD, certifications to corporate training —
            discover courses curated from universities, top instructors and
            industry leaders, all in one marketplace built for ambitious
            learners.
          </motion.p>

          {/* Search */}
          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22 }}
            action="/explore"
            className="mt-7 flex max-w-xl items-center gap-2 rounded-2xl bg-white p-2 shadow-xl"
          >
            <Search className="ml-2 size-5" style={{ color: "var(--ed-mute)" }} />
            <input
              name="q"
              placeholder="What do you want to learn today? e.g. AWS, JEE, AI Prompting…"
              aria-label="Search courses"
              className="h-11 flex-1 bg-transparent px-1 text-sm outline-none"
              style={{ color: "var(--ed-ink)" }}
            />
            <button
              type="submit"
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--ed-blue)" }}
            >
              Search
            </button>
          </motion.form>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-9 grid max-w-xl grid-cols-4 gap-4"
          >
            {statTiles.map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-extrabold text-white md:text-3xl">
                  {s.value}
                </div>
                <div className="text-[10px] font-bold tracking-widest text-white/55">
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>

          {/* Secondary CTA row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-7 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/partner-program"
              className="text-xs font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline"
            >
              Become a partner →
            </Link>
            <span className="text-white/30">·</span>
            <Link
              href="/diagnostic"
              className="text-xs font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline"
            >
              Free 7-minute Business X-Ray
            </Link>
          </motion.div>
        </div>

        {/* Right: floating cards */}
        <div className="relative min-h-[460px] md:col-span-5 md:min-h-[520px]">
          <HeroCard
            course={c1}
            style="intro-blue"
            rotate={-4}
            delay={0.15}
            className="left-0 top-2 md:left-2 md:top-4"
            reviewsLabel="12.4k"
          />
          <HeroCard
            course={c2}
            style="thumb-green"
            rotate={5}
            delay={0.28}
            className="right-0 top-24 md:right-[-12px] md:top-20"
          />
          <HeroCard
            course={c3}
            style="intro-dark"
            rotate={-3}
            delay={0.4}
            className="left-6 top-[260px] md:left-12 md:top-[280px]"
            reviewsLabel="3.1k"
          />
        </div>
      </div>
    </section>
  );
}
