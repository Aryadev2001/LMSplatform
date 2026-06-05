"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Sparkles,
  PlayCircle,
  Star,
  Coins,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import {
  AI_SERVICES,
  AI_CATEGORIES,
  formatAiPrice,
  formatAiOldPrice,
  type AiService,
  type AiCategory,
} from "@/lib/ai-services";

export interface CatalogCourse {
  id: string;
  name: string;
  slug: string | null;
  tagline: string | null;
  imageUrl: string | null;
  priceCents: number;
  currency: string;
}

const CAT_COLOR: Record<AiCategory, string> = {
  Career: "var(--ed-indigo)",
  Learning: "var(--ed-blue)",
  Productivity: "var(--ed-teal)",
  Developer: "var(--ed-pink)",
};

function getNow(s: AiService) {
  // No cart/checkout yet (that's a later screen) — honest placeholder.
  toast.success(
    `${s.name} selected — checkout opens once the cart screen is live.`,
  );
}

export function AiCatalog({
  pointsBalance,
  courses = [],
  enrolledProgramIds = [],
}: {
  pointsBalance: number;
  courses?: CatalogCourse[];
  enrolledProgramIds?: string[];
}) {
  const [cat, setCat] = useState<"All" | AiCategory>("All");
  const [preview, setPreview] = useState<AiService | null>(null);

  const list =
    cat === "All" ? AI_SERVICES : AI_SERVICES.filter((s) => s.category === cat);
  const enrolled = new Set(enrolledProgramIds);

  return (
    <div>
      {/* AI Courses — real platform courses, purchasable */}
      {courses.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <GraduationCap className="size-5" style={{ color: "var(--ed-green-dark)" }} />
            <h2 className="text-lg font-bold tracking-tight">AI Courses</h2>
            <span className="text-xs font-medium text-muted-foreground">by EuroDigital</span>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {courses.map((c) => {
              const owned = enrolled.has(c.id);
              const free = c.priceCents === 0;
              const href = owned
                ? c.slug
                  ? `/student/courses/${c.slug}`
                  : "/student/courses"
                : c.slug
                  ? `/courses/${c.slug}`
                  : "#";
              const initial = c.name.trim().charAt(0).toUpperCase() || "•";
              return (
                <Link
                  key={c.id}
                  href={href}
                  className="group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
                  style={{ borderColor: "var(--ed-line)" }}
                >
                  <div className="relative h-32 overflow-hidden" style={{ background: "var(--ed-gradient)" }}>
                    {c.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.imageUrl}
                        alt={c.name}
                        className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <>
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-0 opacity-30"
                          style={{ background: "var(--ed-halftone)" }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-5xl font-black text-white/90">
                          {initial}
                        </span>
                      </>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/45 to-transparent" />
                    {owned ? (
                      <span
                        className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
                        style={{ background: "var(--ed-green-dark)" }}
                      >
                        <CheckCircle2 className="size-3" /> Enrolled
                      </span>
                    ) : (
                      <span
                        className="absolute right-3 top-3 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold tabular-nums backdrop-blur"
                        style={
                          free
                            ? { background: "var(--ed-green-dark)", color: "white" }
                            : { background: "rgba(255,255,255,0.92)", color: "var(--ed-ink)" }
                        }
                      >
                        {free ? "Free" : formatCurrency(c.priceCents, c.currency)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="line-clamp-2 text-sm font-extrabold leading-snug">{c.name}</h3>
                    {c.tagline && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.tagline}</p>
                    )}
                    <div
                      className="mt-auto flex items-center justify-between border-t pt-3"
                      style={{ borderColor: "var(--ed-line)" }}
                    >
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {owned ? "In your courses" : free ? "Free" : "One-time"}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 text-xs font-bold transition-transform group-hover:translate-x-0.5"
                        style={{ color: "var(--ed-blue)" }}
                      >
                        {owned ? "Continue" : "View & enroll"}
                        <ArrowRight className="size-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5" style={{ color: "var(--ed-blue)" }} />
          <h2 className="text-lg font-bold tracking-tight">
            AI Services Catalog
            <span className="ml-2 text-xs font-medium text-muted-foreground">
              powered by europic.ai
            </span>
          </h2>
        </div>
        <div
          className="inline-flex items-center gap-2 self-start rounded-full px-3.5 py-1.5 text-sm font-semibold text-white"
          style={{ background: "var(--ed-green-dark)" }}
        >
          <Coins className="size-4" />
          {pointsBalance.toLocaleString()} reward points available
        </div>
      </div>

      {/* Filter chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        {AI_CATEGORIES.map((c) => {
          const active = cat === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className="rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors"
              style={{
                borderColor: "var(--ed-line)",
                background: active ? "var(--ed-ink)" : "white",
                color: active ? "white" : "var(--ed-ink-2)",
              }}
            >
              {c}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {list.map((s) => {
          const oldP = formatAiOldPrice(s);
          return (
            <div
              key={s.id}
              className="flex flex-col overflow-hidden rounded-2xl border bg-white"
              style={{ borderColor: "var(--ed-line)" }}
            >
              {/* Clickable preview header */}
              <button
                type="button"
                onClick={() => setPreview(s)}
                className="relative flex h-28 items-center justify-center text-3xl"
                style={{ background: "var(--ed-gradient)" }}
              >
                <div
                  className="absolute inset-0"
                  style={{ background: "var(--ed-halftone)" }}
                />
                <span className="relative">{s.icon}</span>
                <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-[color:var(--ed-ink)]">
                  <PlayCircle className="size-3" /> Preview
                </span>
                {s.badge && (
                  <span
                    className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                    style={{ background: "var(--ed-rose)" }}
                  >
                    {s.badge}
                  </span>
                )}
              </button>

              <div className="flex flex-1 flex-col p-4">
                <span
                  className="w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                  style={{ background: CAT_COLOR[s.category] }}
                >
                  {s.category}
                </span>
                <h3 className="mt-2 text-sm font-bold leading-snug">{s.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {s.description}
                </p>

                <div
                  className="mt-2 flex items-center gap-1 text-[11px] font-semibold"
                  style={{ color: "var(--ed-warn)" }}
                >
                  <Star className="size-3 fill-current" /> 4.8
                </div>

                <div
                  className="mt-1 text-xs font-bold"
                  style={{ color: "var(--ed-green-dark)" }}
                >
                  +{s.rewardPoints} pts on purchase
                </div>

                <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--ed-line)" }}>
                  <span className="text-base font-extrabold">
                    {formatAiPrice(s)}
                    {oldP && (
                      <span className="ml-1.5 text-xs font-medium text-muted-foreground line-through">
                        {oldP}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => getNow(s)}
                    className="rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                    style={{ background: "var(--ed-gradient)" }}
                  >
                    Get Now
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview modal */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-lg">
          {preview && (
            <>
              <div
                className="relative -m-6 mb-0 flex h-40 items-center justify-center rounded-t-lg text-5xl"
                style={{ background: "var(--ed-gradient)" }}
              >
                <div className="absolute inset-0 rounded-t-lg" style={{ background: "var(--ed-halftone)" }} />
                <span className="relative">{preview.icon}</span>
              </div>
              <DialogHeader className="pt-2">
                <DialogTitle>{preview.name}</DialogTitle>
                <DialogDescription>{preview.description}</DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--ed-line)" }}>
                <span className="font-bold" style={{ color: "var(--ed-green-dark)" }}>
                  +{preview.rewardPoints} reward points
                </span>
                <span className="text-lg font-extrabold">{formatAiPrice(preview)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Demo video & instant provisioning via europic.ai activate in Phase 2.
                This is a Phase-1 placeholder service.
              </p>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setPreview(null)}
                  className="rounded-xl"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    getNow(preview);
                    setPreview(null);
                  }}
                  className="rounded-xl text-white"
                  style={{ background: "var(--ed-gradient)" }}
                >
                  Get Now
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
