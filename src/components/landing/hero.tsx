"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

const FADE_UP = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 + i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pt-44 pb-20 md:pt-52 md:pb-28">
      <div className="absolute inset-0 -z-10 bg-grid-soft" />

      <div className="mx-auto max-w-4xl px-6 text-center">
        <motion.div
          variants={FADE_UP}
          initial="hidden"
          animate="show"
          custom={0}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/10 bg-background/80 px-3 py-1 text-xs text-muted-foreground"
        >
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8CC63F] opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-[#8CC63F]" />
          </span>
          <span>Free 7-minute Business X-Ray — no signup to see results</span>
        </motion.div>

        <motion.h1
          variants={FADE_UP}
          initial="hidden"
          animate="show"
          custom={1}
          className="text-balance text-5xl font-semibold leading-[1.05] tracking-tighter md:text-7xl"
        >
          Find out what&apos;s really{" "}
          <span className="text-brand-gradient">holding your business back</span>
        </motion.h1>

        <motion.p
          variants={FADE_UP}
          initial="hidden"
          animate="show"
          custom={2}
          className="mx-auto mt-6 max-w-xl text-balance text-base text-muted-foreground md:text-lg"
        >
          The Business X-Ray scans your business across 7 layers, scores it 0–100, and shows you the
          single biggest constraint to fix first — with a personalised roadmap.
        </motion.p>

        <motion.div
          variants={FADE_UP}
          initial="hidden"
          animate="show"
          custom={3}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link
            href="/diagnostic"
            className={buttonVariants({
              size: "lg",
              className:
                "group h-12 bg-brand-gradient px-7 text-sm font-semibold text-white hover:opacity-95",
            })}
          >
            Take the Business X-Ray — free
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/sign-in"
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className: "h-12 px-6 text-sm",
            })}
          >
            Student sign in
          </Link>
        </motion.div>

        <motion.div
          variants={FADE_UP}
          initial="hidden"
          animate="show"
          custom={4}
          className="mt-6 text-xs text-muted-foreground"
        >
          7 layers · 21 questions · ~7 minutes · instant scored report
        </motion.div>
      </div>

      {/* Report preview */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto mt-20 max-w-3xl px-6"
      >
        <div className="relative overflow-hidden rounded-2xl bg-card p-8 shadow-soft ring-1 ring-black/5">
          <div className="grid items-center gap-8 sm:grid-cols-[180px_1fr]">
            <div className="flex flex-col items-center">
              <svg width="160" height="160" viewBox="0 0 180 180">
                <defs>
                  <linearGradient id="hero-g" x1="0" y1="0" x2="1" y2="1">
                    <stop stopColor="#8CC63F" />
                    <stop offset="1" stopColor="#1AADE0" />
                  </linearGradient>
                </defs>
                <circle cx="90" cy="90" r="70" fill="none" stroke="#E2E8F0" strokeWidth="12" />
                <circle
                  cx="90"
                  cy="90"
                  r="70"
                  fill="none"
                  stroke="url(#hero-g)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(63 / 100) * 2 * Math.PI * 70} ${2 * Math.PI * 70}`}
                  transform="rotate(-90 90 90)"
                />
                <text x="90" y="84" textAnchor="middle" className="fill-foreground" style={{ fontSize: 38, fontWeight: 700 }}>
                  63
                </text>
                <text x="90" y="108" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11 }}>
                  Health Score
                </text>
              </svg>
              <span
                className="mt-3 rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #8CC63F 0%, #1AADE0 100%)" }}
              >
                Growth stage
              </span>
            </div>
            <div className="space-y-2.5">
              {[
                { label: "Business Model Clarity", v: 78 },
                { label: "Lead Generation System", v: 41 },
                { label: "Sales Process", v: 35 },
                { label: "Team & Delegation", v: 58 },
              ].map((b) => (
                <div key={b.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium">{b.label}</span>
                    <span className="tabular-nums text-muted-foreground">{b.v}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${b.v}%`,
                        background: b.v < 40 ? "#F59E0B" : b.v < 70 ? "#1AADE0" : "#8CC63F",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
