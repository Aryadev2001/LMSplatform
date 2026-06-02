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
  const flat = modules.flatMap((m) => m.lessons);
  const firstIncomplete = flat.find((l) => !l.completed) ?? flat[0];
  const [activeId, setActiveId] = useState(firstIncomplete?.id);
  const [pending, startTransition] = useTransition();
  const active = flat.find((l) => l.id === activeId);

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
        {modules.map((mod, i) => (
          <div key={mod.id} className="overflow-hidden rounded-2xl bg-card shadow-card">
            <div className="border-b border-black/5 px-4 py-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Module {i + 1}
              </div>
              <div className="text-sm font-semibold">{mod.title}</div>
            </div>
            <ul className="divide-y divide-black/5">
              {mod.lessons.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(l.id)}
                    className={`flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm transition-colors hover:bg-secondary/60 ${
                      activeId === l.id ? "bg-secondary/60" : ""
                    }`}
                  >
                    {l.completed ? (
                      <CheckCircle2 className="size-4 shrink-0 text-[#8CC63F]" />
                    ) : (
                      <Circle className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="flex-1 truncate">{l.title}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {Math.round(l.durationSeconds / 60)}m
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
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
