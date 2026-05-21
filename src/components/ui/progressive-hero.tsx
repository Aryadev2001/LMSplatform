"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Search, ArrowRight, GraduationCap, ShieldCheck } from "lucide-react";

/**
 * Landing hero — the "progressive" pattern (full-bleed video, dark overlay,
 * animated rotating headline word, badge + dual CTAs, ambient glow) adapted
 * to the eurodigital brand. Reuses the .ed-aura glow + brand tokens from
 * globals.css so it's visually consistent with the rest of the app.
 *
 * The background video is an external asset with a graceful brand-gradient
 * + poster fallback, so the hero never renders broken if it fails to load.
 */
export function ProgressiveHero({
  institutes,
  statTiles,
}: {
  institutes: number;
  statTiles: { value: string; label: string }[];
}) {
  const reduceMotion = useReducedMotion();
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["limitless", "future-proof", "career-defining"],
    [],
  );

  useEffect(() => {
    if (reduceMotion) return;
    const id = setTimeout(() => {
      setTitleNumber((n) => (n === titles.length - 1 ? 0 : n + 1));
    }, 2200);
    return () => clearTimeout(id);
  }, [titleNumber, titles, reduceMotion]);

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "var(--ed-ink)" }}
    >
      {/* Background video — brand-ink base shows through if it fails */}
      <video
        aria-hidden
        className="absolute inset-0 size-full object-cover opacity-40"
        src="https://videos.pexels.com/video-files/18526841/uhd_30fps.mp4"
        poster="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1600&q=55"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
      />

      {/* Ink wash for text contrast + brand glow */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(14,30,43,0.80) 0%, rgba(14,30,43,0.93) 100%)",
        }}
      />
      <span
        aria-hidden
        className="ed-aura pointer-events-none absolute -left-32 -top-40 size-[34rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(0,174,239,0.35) 0%, transparent 70%)",
        }}
      />
      <span
        aria-hidden
        className="ed-aura ed-aura-b pointer-events-none absolute -right-24 -bottom-44 size-[36rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(141,198,63,0.30) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-5xl px-6 py-24 text-center md:py-32">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.14)",
            color: "rgba(255,255,255,0.85)",
          }}
        >
          <ShieldCheck className="size-3.5" style={{ color: "var(--ed-green)" }} />
          {institutes}+ verified institutes
        </span>

        <h1 className="font-display mx-auto mt-7 max-w-3xl text-balance text-4xl font-extrabold leading-[1.1] tracking-tight text-white md:text-6xl">
          Learn from the world&apos;s best.
          <span className="relative mt-1 flex w-full justify-center overflow-hidden md:pb-3 md:pt-2">
            &nbsp;
            {titles.map((title, index) => (
              <motion.span
                key={title}
                className="absolute bg-clip-text font-extrabold text-transparent"
                style={{ backgroundImage: "var(--ed-gradient)" }}
                initial={{ opacity: 0, y: reduceMotion ? 0 : -120 }}
                transition={{ type: "spring", stiffness: 50 }}
                animate={
                  titleNumber === index
                    ? { y: 0, opacity: 1 }
                    : {
                        y: reduceMotion ? 0 : titleNumber > index ? -150 : 150,
                        opacity: reduceMotion ? 0 : 0,
                      }
                }
              >
                Build something {title}.
              </motion.span>
            ))}
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-balance text-base leading-relaxed text-white/65 md:text-lg">
          A global learning marketplace — courses from verified institutes,
          recognised certificates, and rewards as you grow. Start free; pay
          only when you enrol in a paid course.
        </p>

        {/* Primary LMS action — search */}
        <form
          action="/explore"
          className="mx-auto mt-9 flex max-w-xl items-center gap-2 rounded-2xl p-2"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.14)",
            backdropFilter: "blur(6px)",
          }}
        >
          <Search className="ml-2 size-5 text-white/55" />
          <input
            name="q"
            placeholder="What do you want to learn today?"
            aria-label="Search courses"
            className="h-11 flex-1 bg-transparent px-1 text-sm text-white placeholder:text-white/45 outline-none"
          />
          <button
            type="submit"
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--ed-gradient)" }}
          >
            Search
          </button>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--ed-gradient)" }}
          >
            Explore courses <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-colors"
            style={{
              border: "1px solid rgba(255,255,255,0.20)",
              color: "white",
            }}
          >
            <GraduationCap className="size-4" style={{ color: "var(--ed-green)" }} />
            Teach on eurodigital
          </Link>
        </div>

        <div className="mx-auto mt-12 grid max-w-2xl grid-cols-4 gap-4">
          {statTiles.map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-extrabold text-white md:text-3xl">
                {s.value}
              </div>
              <div className="text-[10px] font-bold tracking-widest text-white/50">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
