"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { GraduationCap, Clock, Share2, Heart, Copy, Check } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { StorefrontCourse } from "@/lib/storefront";

const TABS = ["All Courses", "About", "Reviews", "FAQ"] as const;
type Tab = (typeof TABS)[number];

export function StorefrontBody({
  tenantName,
  heroTagline,
  courses,
}: {
  tenantName: string;
  heroTagline: string | null;
  courses: StorefrontCourse[];
}) {
  const [tab, setTab] = useState<Tab>("All Courses");
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* manual select fallback */
    }
  }

  const faqs = [
    { q: `Who is ${tenantName}?`, a: `${tenantName} is a verified institute on eurodigital.coach offering the courses listed here.` },
    { q: "How do I enrol?", a: "Open any course, choose Enrol now or add it to your cart, and check out. Access is granted instantly." },
    { q: "Do I get a certificate?", a: "Yes — complete all modules of a course to unlock a verifiable certificate with a public verification link." },
    { q: "Can I learn at my own pace?", a: "Yes. Lifetime access — start, pause and resume any time." },
  ];

  return (
    <section id="courses" className="mx-auto max-w-6xl px-6 pb-24">
      {/* Actions */}
      <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() =>
            toast.success(`Following ${tenantName} — you'll be notified of new courses (sign in to save).`)
          }
          className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold transition-colors hover:bg-secondary"
        >
          <Heart className="size-4" /> Follow
        </button>
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold transition-colors hover:bg-secondary"
        >
          {copied ? <Check className="size-4 text-emerald-600" /> : <Share2 className="size-4" />}
          {copied ? "Link copied" : "Share"}
        </button>
      </div>

      {/* Tab nav */}
      <div className="mb-8 flex gap-1 overflow-x-auto border-b border-black/5">
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="relative whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors"
              style={{ color: active ? "var(--primary)" : undefined }}
            >
              {t}
              {t === "All Courses" && (
                <span className="ml-1.5 text-xs text-muted-foreground">({courses.length})</span>
              )}
              {active && (
                <span
                  className="absolute inset-x-2 bottom-0 h-0.5 rounded-full"
                  style={{ background: "var(--brand-gradient)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* All Courses */}
      {tab === "All Courses" &&
        (courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 py-16 text-center text-sm text-muted-foreground">
            No published courses yet — check back soon.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <Link
                key={c.id}
                href={c.slug ? `/courses/${c.slug}` : "/sign-in"}
                className="group flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                <div
                  className="flex h-36 items-center justify-center text-white"
                  style={{ background: "var(--brand-gradient)" }}
                >
                  <GraduationCap className="size-10 opacity-90" />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {c.tier === "high" ? "Advanced" : c.tier === "mid" ? "Intermediate" : "Foundation"}
                    </span>
                    {c.type === "subscription" && (
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Subscription
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold tracking-tight">{c.title}</h3>
                  {c.tagline && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.tagline}</p>
                  )}
                  <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-4">
                    <span className="text-lg font-bold">
                      {formatCurrency(c.priceCents, c.currency)}
                      {c.type === "subscription" && (
                        <span className="text-xs font-normal text-muted-foreground"> /mo</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3.5" />
                      {c.durationMonths} mo
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ))}

      {/* About */}
      {tab === "About" && (
        <div className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong className="text-foreground">{tenantName}</strong> is a
            verified institute on eurodigital.coach.
          </p>
          {heroTagline && <p className="mt-3">{heroTagline}</p>}
          <p className="mt-3">
            Browse the catalog above — enrol, learn at your own pace, and earn
            a verifiable certificate on completion.
          </p>
        </div>
      )}

      {/* Reviews — honest empty (no reviews model yet) */}
      {tab === "Reviews" && (
        <div className="rounded-2xl border border-dashed border-black/10 py-14 text-center text-sm text-muted-foreground">
          No reviews yet — learners can review after completing a course.
        </div>
      )}

      {/* FAQ */}
      {tab === "FAQ" && (
        <div className="max-w-2xl space-y-3">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-black/5 bg-card px-5 py-4"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                {f.q}
                <span className="text-muted-foreground transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
