"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileUpload } from "@/components/file-upload";
import { createLesson, updateLesson } from "./actions";

interface Resource {
  label: string;
  url: string;
}

interface LessonDialogProps {
  courseId: string;
  moduleId: string;
  mode?: "create" | "edit";
  initial?: {
    id: string;
    title: string;
    videoUrl: string | null;
    durationMinutes: number;
    resources: Resource[];
  };
}

export function LessonDialog({ courseId, moduleId, mode = "create", initial }: LessonDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? "");
  const [duration, setDuration] = useState(String(initial?.durationMinutes ?? 10));
  const [resources, setResources] = useState<Resource[]>(initial?.resources ?? []);

  function reset() {
    if (mode === "create") {
      setTitle("");
      setVideoUrl("");
      setDuration("10");
      setResources([]);
    }
  }

  function submit() {
    startTransition(async () => {
      const payload = {
        moduleId,
        courseId,
        title,
        videoUrl,
        durationMinutes: Number(duration) || 0,
        resources: resources.filter((r) => r.label && r.url),
      };
      const r =
        mode === "edit" && initial
          ? await updateLesson(initial.id, payload)
          : await createLesson(payload);
      if (r.success) {
        toast.success(mode === "edit" ? "Lesson updated" : "Lesson added");
        reset();
        setOpen(false);
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {mode === "edit" ? (
        <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Edit lesson" />}>
          <Pencil className="size-3.5" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button variant="outline" size="sm" className="rounded-lg" />}>
          <Plus className="size-3.5" /> Add lesson
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit lesson" : "New lesson"}</DialogTitle>
          <DialogDescription>
            Paste a video URL (YouTube, Vimeo, Mux, or a direct .mp4 link) and attach resources.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Lesson title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. The 7-Layer Business Scan"
              className="h-10 rounded-xl border-black/10"
            />
          </div>

          <div className="grid grid-cols-[1fr_100px] gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Lesson video</Label>
              <FileUpload
                accept="video/*"
                label="video"
                value={videoUrl || null}
                onUploaded={(url) => setVideoUrl(url)}
                onClear={() => setVideoUrl("")}
              />
              {!videoUrl && (
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="…or paste a YouTube / Vimeo / .mp4 URL"
                  className="mt-2 h-9 rounded-xl border-black/10 text-xs"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Mins</Label>
              <Input
                type="number"
                min="0"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="h-10 rounded-xl border-black/10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Resources (PDF / links)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setResources((r) => [...r, { label: "", url: "" }])}
                className="h-7 rounded-lg text-xs"
              >
                <Plus className="size-3" /> Add
              </Button>
            </div>
            {resources.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No resources. Add a downloadable PDF, worksheet, or external link.
              </p>
            )}
            <div className="space-y-3">
              {resources.map((res, i) => (
                <div
                  key={i}
                  className="space-y-2 rounded-xl border border-black/8 bg-secondary/30 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      value={res.label}
                      onChange={(e) =>
                        setResources((rs) =>
                          rs.map((r, idx) => (idx === i ? { ...r, label: e.target.value } : r)),
                        )
                      }
                      placeholder="Label (e.g. Workbook PDF)"
                      className="h-9 rounded-lg border-black/10 text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setResources((rs) => rs.filter((_, idx) => idx !== i))}
                      aria-label="Remove resource"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                  <FileUpload
                    accept=".pdf,.zip,.docx,.xlsx,image/*"
                    label="file"
                    value={res.url || null}
                    onUploaded={(url) =>
                      setResources((rs) => rs.map((r, idx) => (idx === i ? { ...r, url } : r)))
                    }
                    onClear={() =>
                      setResources((rs) => rs.map((r, idx) => (idx === i ? { ...r, url: "" } : r)))
                    }
                  />
                  {!res.url && (
                    <Input
                      value={res.url}
                      onChange={(e) =>
                        setResources((rs) =>
                          rs.map((r, idx) => (idx === i ? { ...r, url: e.target.value } : r)),
                        )
                      }
                      placeholder="…or paste a link (Drive, etc.)"
                      className="h-8 rounded-lg border-black/10 text-xs"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending} className="rounded-xl">
            {pending && <Loader2 className="size-4 animate-spin" />}
            {mode === "edit" ? "Save" : "Add lesson"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

