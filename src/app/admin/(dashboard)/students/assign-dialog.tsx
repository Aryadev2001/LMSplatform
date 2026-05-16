"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignStudent } from "../actions";

interface ProgramOption {
  id: string;
  name: string;
}

interface AssignDialogProps {
  student: { userId: string; name: string };
  programsList: ProgramOption[];
  currentProgramId: string | null;
}

const UNASSIGNED = "__unassigned__";

export function AssignDialog({ student, programsList, currentProgramId }: AssignDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [programId, setProgramId] = useState<string>(currentProgramId ?? UNASSIGNED);

  function onSubmit() {
    startTransition(async () => {
      const r = await assignStudent({
        studentUserId: student.userId,
        programId: programId === UNASSIGNED ? null : programId,
      });
      if (r.success) {
        toast.success("Course assignment updated");
        setOpen(false);
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" className="rounded-lg" />}>
        <BookOpen className="size-3.5" />
        Assign course
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign {student.name}</DialogTitle>
          <DialogDescription>Enroll this student into a course.</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Course</Label>
          <Select value={programId} onValueChange={(v) => setProgramId(v ?? UNASSIGNED)}>
            <SelectTrigger className="h-10 rounded-xl border-black/10">
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>— Unassigned</SelectItem>
              {programsList.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={pending} className="rounded-xl">
            {pending && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
