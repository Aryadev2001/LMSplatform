"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, PlayCircle, Loader2, Lock, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markLessonComplete } from "./actions";

interface LessonItem {
  id: string;
  title: string;
  durationSeconds: number;
  /** Resolved + access-gated server-side. null = no video / not entitled.
   *  For our hosted files `src` is the protected /api/lessons/<id>/stream
   *  proxy — never the raw Blob URL. */
  media: { kind: "video" | "iframe"; src: string } | null;
  resources: { label: string; url: string }[];
  completed: boolean;
}
interface ModuleItem {
  id: string;
  title: string;
  /** Drip lock — true until the module's release date / unlock-after-days. */
  locked?: boolean;
  unlockAt?: string | null;
  lessons: LessonItem[];
}

export function CoursePlayer({
  slug,
  modules,
  locked,
}: {
  slug: string;
  modules: ModuleItem[];
  locked: boolean;
}) {
  // Lessons in UNLOCKED modules only — drives default selection + "next".
  const flat = modules.flatMap((m) => (m.locked ? [] : m.lessons));
  const firstIncomplete = flat.find((l) => !l.completed) ?? flat[0];
  const [activeId, setActiveId] = useState(firstIncomplete?.id);
  const [pending, startTransition] = useTransition();
  const active = flat.find((l) => l.id === activeId);

  const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0);
  const totalDone = modules.reduce(
    (s, m) => s + m.lessons.filter((l) => l.completed).length,
    0,
  );

  function complete(lessonId: string) {
    startTransition(async () => {
      const r = await markLessonComplete({ lessonId, slug });
      if (r.success) {
        toast.success("Lesson marked complete");
        const idx = flat.findIndex((l) => l.id === lessonId);
        const nxt = flat[idx + 1];
        if (nxt) setActiveId(nxt.id);
      } else {
        toast.error(r.error);
      }
    });
  }

  if (locked) {
    return (
      <div className="rounded-2xl bg-card p-10 text-center shadow-card">
        <Lock className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          This course isn&apos;t unlocked for your account yet.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Player */}
      <div className="space-y-4">
        <div className="aspect-video overflow-hidden rounded-2xl bg-foreground shadow-card">
          <VideoArea title={active?.title} media={active?.media ?? null} />
        </div>
        {active && (
          <div className="flex items-center justify-between rounded-2xl bg-card p-5 shadow-card">
            <div>
              <div className="text-sm font-semibold">{active.title}</div>
              <div className="text-xs text-muted-foreground">
                {Math.round(active.durationSeconds / 60)} min
              </div>
            </div>
            <Button
              onClick={() => complete(active.id)}
              disabled={pending || active.completed}
              className="rounded-xl"
              style={
                active.completed
                  ? undefined
                  : { background: "linear-gradient(135deg, #8CC63F 0%, #1AADE0 100%)", color: "#fff" }
              }
              variant={active.completed ? "outline" : "default"}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : active.completed ? (
                <CheckCircle2 className="size-4" />
              ) : null}
              {active.completed ? "Completed" : "Mark complete"}
            </Button>
          </div>
        )}

        {active && active.resources.length > 0 && (
          <div className="rounded-2xl bg-card p-5 shadow-card">
            <div className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">
              Resources
            </div>
            <ul className="space-y-2">
              {active.resources.map((r, i) => (
                <li key={i}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3 text-sm transition-colors hover:bg-secondary"
                  >
                    <span className="flex items-center gap-2.5">
                      <FileDown className="size-4 text-[#1AADE0]" />
                      {r.label}
                    </span>
                    <span className="text-xs text-muted-foreground">Open</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Curriculum */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold">Course content</h3>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {totalDone}/{totalLessons} done
          </span>
        </div>

        {modules.map((mod, i) => {
          const done = mod.lessons.filter((l) => l.completed).length;
          const total = mod.lessons.length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          const moduleDone = total > 0 && done === total;
          const hasActive = mod.lessons.some((l) => l.id === activeId);
          // Clicking anywhere on the module header opens its first unfinished
          // lesson (or its first lesson) — so the whole box is clickable, not
          // just the lesson row.
          const headerTarget =
            mod.lessons.find((l) => !l.completed) ?? mod.lessons[0];

          return (
            <div
              key={mod.id}
              className="overflow-hidden rounded-2xl border bg-card transition-shadow duration-300"
              style={
                hasActive
                  ? {
                      borderColor: "rgba(26,173,224,0.35)",
                      boxShadow:
                        "0 0 0 1px rgba(26,173,224,0.18), 0 16px 42px -20px rgba(26,173,224,0.55)",
                    }
                  : { borderColor: "rgba(0,0,0,0.06)" }
              }
            >
              <button
                type="button"
                disabled={mod.locked || !headerTarget}
                onClick={() => headerTarget && setActiveId(headerTarget.id)}
                className={`block w-full px-4 py-3 text-left transition-colors ${
                  mod.locked ? "cursor-not-allowed" : "hover:bg-secondary/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-[10px] font-extrabold uppercase tracking-widest"
                    style={{
                      backgroundImage: "linear-gradient(90deg,#8CC63F,#1AADE0)",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                    }}
                  >
                    Module {i + 1}
                  </span>
                  {mod.locked ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                      <Lock className="size-3" />
                      {mod.unlockAt
                        ? `Unlocks ${new Date(mod.unlockAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                        : "Locked"}
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums"
                      style={
                        moduleDone
                          ? { background: "rgba(141,198,63,0.16)", color: "#5f8f1f" }
                          : { background: "rgba(0,0,0,0.05)", color: "#64748b" }
                      }
                    >
                      {moduleDone && <CheckCircle2 className="size-3" />}
                      {done}/{total}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm font-bold leading-snug">{mod.title}</div>
                {!mod.locked && total > 0 && (
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: "linear-gradient(90deg,#8CC63F,#1AADE0)",
                      }}
                    />
                  </div>
                )}
              </button>

              <ul className="border-t border-black/5">
                {mod.lessons.map((l) => {
                  const isActive = activeId === l.id;
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        disabled={mod.locked}
                        onClick={() => !mod.locked && setActiveId(l.id)}
                        className={`relative flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-all duration-200 ${
                          mod.locked
                            ? "cursor-not-allowed opacity-55"
                            : "hover:bg-secondary/50"
                        } ${isActive ? "font-semibold" : ""}`}
                        style={
                          isActive
                            ? {
                                background:
                                  "linear-gradient(90deg, rgba(141,198,63,0.13) 0%, rgba(26,173,224,0.13) 100%)",
                                boxShadow: "inset 0 0 0 1px rgba(26,173,224,0.25)",
                              }
                            : undefined
                        }
                      >
                        {isActive && (
                          <span
                            aria-hidden
                            className="absolute inset-y-2 left-0 w-1 rounded-r-full"
                            style={{ background: "linear-gradient(180deg,#8CC63F,#1AADE0)" }}
                          />
                        )}
                        {mod.locked ? (
                          <Lock className="size-4 shrink-0 text-muted-foreground" />
                        ) : l.completed ? (
                          <CheckCircle2 className="size-4 shrink-0 text-[#8CC63F]" />
                        ) : isActive ? (
                          <PlayCircle className="size-4 shrink-0 text-[#1AADE0]" />
                        ) : (
                          <Circle className="size-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="flex-1 truncate">{l.title}</span>
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {Math.round(l.durationSeconds / 60)}m
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VideoArea({
  title,
  media,
}: {
  title?: string;
  media: { kind: "video" | "iframe"; src: string } | null;
}) {
  if (!media) {
    return (
      <div className="flex h-full items-center justify-center text-background">
        <div className="text-center">
          <PlayCircle className="mx-auto size-12 opacity-70" />
          <p className="mt-3 text-sm opacity-80">{title ?? "Select a lesson"}</p>
          <p className="mt-1 text-[11px] opacity-50">No video for this lesson</p>
        </div>
      </div>
    );
  }

  if (media.kind === "video") {
    return (
      <video
        src={media.src}
        controls
        controlsList="nodownload"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        className="size-full"
        preload="metadata"
      >
        Your browser does not support video.
      </video>
    );
  }

  return (
    <iframe
      src={media.src}
      title={title ?? "Lesson video"}
      className="size-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}
