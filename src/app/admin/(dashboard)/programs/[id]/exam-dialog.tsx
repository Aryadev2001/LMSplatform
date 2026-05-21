"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2, Edit3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createExam, updateExam, deleteExam } from "./exams-actions";

interface ModuleOption {
  id: string;
  title: string;
}

interface InitialExam {
  id: string;
  title: string;
  moduleId: string | null;
  durationMinutes: number;
  passingMarks: number;
  isActive: boolean;
}

interface ExamDialogProps {
  courseId: string;
  modules: ModuleOption[];
  mode: "create" | "edit";
  initial?: InitialExam;
}

export function ExamDialog({ courseId, modules, mode, initial }: ExamDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [moduleId, setModuleId] = useState<string>(initial?.moduleId ?? "course");
  const [durationMinutes, setDurationMinutes] = useState(
    initial?.durationMinutes ?? 30,
  );
  const [passingMarks, setPassingMarks] = useState(initial?.passingMarks ?? 0);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  function onSave() {
    const moduleIdValue = moduleId === "course" ? null : moduleId;
    startTransition(async () => {
      const payload = {
        courseId,
        title,
        moduleId: moduleIdValue,
        durationMinutes: Number(durationMinutes),
        passingMarks: Number(passingMarks),
        isActive,
      };
      const r =
        mode === "edit" && initial
          ? await updateExam({ ...payload, examId: initial.id })
          : await createExam(payload);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success(mode === "edit" ? "Exam updated" : "Exam created");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {mode === "edit" ? (
        <DialogTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Edit exam" />
          }
        >
          <Edit3 className="size-4" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button className="rounded-xl" />}>
          <Plus className="size-4" /> New exam
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit exam" : "Create exam"}</DialogTitle>
          <DialogDescription>
            Exams are tied to a course. Attach one to a specific module for
            a per-module quiz, or leave on &ldquo;Course-level&rdquo; for a
            final exam.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Final exam"
              className="h-10 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Attached to</Label>
            <Select value={moduleId} onValueChange={(v) => v && setModuleId(v)}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="course">Course-level (final exam)</SelectItem>
                {modules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    Module · {m.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Duration (minutes)</Label>
              <Input
                type="number"
                min={1}
                max={600}
                value={durationMinutes}
                onChange={(e) =>
                  setDurationMinutes(Number(e.target.value || 0))
                }
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Passing marks</Label>
              <Input
                type="number"
                min={0}
                value={passingMarks}
                onChange={(e) => setPassingMarks(Number(e.target.value || 0))}
                className="h-10 rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground">
                Total marks update automatically from question marks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-black/8 bg-secondary/40 p-3">
            <Checkbox
              id="exam-active"
              checked={isActive}
              onCheckedChange={(c) => setIsActive(c === true)}
            />
            <Label htmlFor="exam-active" className="cursor-pointer text-sm">
              Active — students can attempt this exam
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="rounded-xl"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {mode === "edit" ? "Save changes" : "Create exam"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteExamButton({
  examId,
  courseId,
}: {
  examId: string;
  courseId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function onDelete() {
    if (
      !window.confirm(
        "Delete this exam and all its questions? This cannot be undone.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r = await deleteExam(examId, courseId);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success("Exam deleted");
      router.refresh();
    });
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={onDelete}
      disabled={pending}
      aria-label="Delete exam"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </Button>
  );
}
