"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createModule, updateModule, deleteModule, deleteLesson } from "./actions";

export function ModuleDialog({
  courseId,
  mode = "create",
  initial,
}: {
  courseId: string;
  mode?: "create" | "edit";
  initial?: {
    id: string;
    title: string;
    description: string | null;
    releaseAt?: string | null;
    unlockAfterDays?: number | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  // Drip controls. releaseAt is a datetime-local string; unlockAfterDays a
  // count of days after enrollment. Either/both empty = available immediately.
  const [releaseAt, setReleaseAt] = useState(initial?.releaseAt ?? "");
  const [unlockAfterDays, setUnlockAfterDays] = useState(
    initial?.unlockAfterDays != null ? String(initial.unlockAfterDays) : "",
  );

  function submit() {
    startTransition(async () => {
      const days = unlockAfterDays.trim() === "" ? null : Number(unlockAfterDays);
      const rel = releaseAt.trim() === "" ? null : releaseAt;
      const r =
        mode === "edit" && initial
          ? await updateModule(initial.id, courseId, title, description, rel, days)
          : await createModule({ courseId, title, description, releaseAt: rel, unlockAfterDays: days });
      if (r.success) {
        toast.success(mode === "edit" ? "Module updated" : "Module added");
        if (mode === "create") {
          setTitle("");
          setDescription("");
          setReleaseAt("");
          setUnlockAfterDays("");
        }
        setOpen(false);
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {mode === "edit" ? (
        <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Edit module" />}>
          <Pencil className="size-3.5" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button className="rounded-xl" />}>
          <Plus className="size-4" /> Add module
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit module" : "New module"}</DialogTitle>
          <DialogDescription>
            Modules group lessons (e.g. &ldquo;Day 1 — The Business MRI&rdquo;).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Module title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Week 1 — Foundation"
              className="h-10 rounded-xl border-black/10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Description <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="max-h-[40vh] overflow-y-auto rounded-xl border-black/10"
            />
          </div>

          {/* Drip / scheduled release */}
          <div className="rounded-xl border border-black/10 p-3">
            <div className="text-xs font-semibold">Drip release <span className="font-normal text-muted-foreground">(optional)</span></div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Keep this module locked until a date, or until N days after the student enrolls. Leave both empty for instant access.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium">Release on</Label>
                <Input
                  type="datetime-local"
                  value={releaseAt}
                  onChange={(e) => setReleaseAt(e.target.value)}
                  className="h-9 rounded-lg border-black/10 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium">Unlock after (days)</Label>
                <Input
                  type="number"
                  min={0}
                  value={unlockAfterDays}
                  onChange={(e) => setUnlockAfterDays(e.target.value)}
                  placeholder="e.g. 7"
                  className="h-9 rounded-lg border-black/10 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending} className="rounded-xl">
            {pending && <Loader2 className="size-4 animate-spin" />}
            {mode === "edit" ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteModuleButton({ moduleId, courseId }: { moduleId: string; courseId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Delete module"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await deleteModule(moduleId, courseId);
          if (!r.success) toast.error(r.error);
        })
      }
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
    </Button>
  );
}

export function DeleteLessonButton({
  lessonId,
  courseId,
}: {
  lessonId: string;
  courseId: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Delete lesson"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await deleteLesson(lessonId, courseId);
          if (!r.success) toast.error(r.error);
        })
      }
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
    </Button>
  );
}
