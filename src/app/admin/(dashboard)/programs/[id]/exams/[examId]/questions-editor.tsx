"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  Trash2,
  Save,
  X,
  Edit3,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from "../../exams-actions";

interface QuestionOption {
  label: string;
  isCorrect: boolean;
}

export interface QuestionRow {
  id: string;
  question: string;
  options: QuestionOption[];
  marks: number;
  orderIndex: number;
}

function emptyOptions(): QuestionOption[] {
  return [
    { label: "", isCorrect: true },
    { label: "", isCorrect: false },
    { label: "", isCorrect: false },
    { label: "", isCorrect: false },
  ];
}

function isValid(text: string, options: QuestionOption[]): string | null {
  if (text.trim().length < 2) return "Question text is required";
  const filled = options.filter((o) => o.label.trim().length > 0);
  if (filled.length < 2) return "Add at least 2 options";
  const correct = filled.filter((o) => o.isCorrect).length;
  if (correct !== 1) return "Mark exactly one option as correct";
  return null;
}

export function QuestionsEditor({
  examId,
  courseId,
  questions,
}: {
  examId: string;
  courseId: string;
  questions: QuestionRow[];
}) {
  return (
    <div className="space-y-4">
      {questions.length === 0 ? (
        <Card className="border-dashed bg-transparent p-10 text-center shadow-none">
          <p className="text-sm font-medium">No questions yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add your first below — questions appear in the order they&apos;re
            created.
          </p>
        </Card>
      ) : (
        questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            examId={examId}
            courseId={courseId}
            row={q}
            index={i}
          />
        ))
      )}

      <NewQuestionForm examId={examId} courseId={courseId} />
    </div>
  );
}

function QuestionCard({
  examId,
  courseId,
  row,
  index,
}: {
  examId: string;
  courseId: string;
  row: QuestionRow;
  index: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  const [text, setText] = useState(row.question);
  const [options, setOptions] = useState<QuestionOption[]>(
    row.options.length >= 2 ? row.options : emptyOptions(),
  );
  const [marks, setMarks] = useState(row.marks);

  function setCorrect(idx: number) {
    setOptions((opts) => opts.map((o, i) => ({ ...o, isCorrect: i === idx })));
  }
  function setLabel(idx: number, label: string) {
    setOptions((opts) => opts.map((o, i) => (i === idx ? { ...o, label } : o)));
  }
  function addOption() {
    if (options.length >= 6) return;
    setOptions((opts) => [...opts, { label: "", isCorrect: false }]);
  }
  function removeOption(idx: number) {
    if (options.length <= 2) return;
    setOptions((opts) => {
      const next = opts.filter((_, i) => i !== idx);
      if (!next.some((o) => o.isCorrect)) next[0].isCorrect = true;
      return next;
    });
  }

  function onSave() {
    const err = isValid(text, options);
    if (err) {
      toast.error(err);
      return;
    }
    startTransition(async () => {
      const r = await updateQuestion({
        questionId: row.id,
        examId,
        courseId,
        question: text,
        options: options
          .map((o) => ({ label: o.label.trim(), isCorrect: o.isCorrect }))
          .filter((o) => o.label.length > 0),
        marks: Number(marks),
      });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success("Question updated");
      setEditing(false);
      router.refresh();
    });
  }

  function onCancel() {
    setText(row.question);
    setOptions(row.options.length >= 2 ? row.options : emptyOptions());
    setMarks(row.marks);
    setEditing(false);
  }

  function onDelete() {
    if (!window.confirm("Delete this question?")) return;
    startTransition(async () => {
      const r = await deleteQuestion(row.id, examId, courseId);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success("Question deleted");
      router.refresh();
    });
  }

  if (!editing) {
    const correctIdx = row.options.findIndex((o) => o.isCorrect);
    return (
      <Card className="border-none bg-card p-5 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <span>Q{index + 1}</span>
              <span>·</span>
              <span>
                {row.marks} mark{row.marks === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-1.5 text-sm font-semibold leading-snug">
              {row.question}
            </p>
            <ul className="mt-3 space-y-1.5">
              {row.options.map((o, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  {o.isCorrect ? (
                    <CheckCircle2
                      className="size-3.5 shrink-0 text-[#8CC63F]"
                      strokeWidth={2.5}
                    />
                  ) : (
                    <Circle className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span
                    className={
                      o.isCorrect
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground"
                    }
                  >
                    {o.label}
                  </span>
                </li>
              ))}
            </ul>
            {correctIdx === -1 && (
              <p className="mt-2 text-[11px] text-destructive">
                ⚠ No correct option marked — edit and fix.
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setEditing(true)}
              aria-label="Edit question"
            >
              <Edit3 className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onDelete}
              disabled={pending}
              aria-label="Delete question"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-none bg-card p-5 shadow-card">
      <QuestionForm
        text={text}
        setText={setText}
        options={options}
        setLabel={setLabel}
        setCorrect={setCorrect}
        addOption={addOption}
        removeOption={removeOption}
        marks={marks}
        setMarks={setMarks}
        index={index}
      />
      <div className="mt-4 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
          className="rounded-xl"
        >
          <X className="size-4" />
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="rounded-xl"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save changes
        </Button>
      </div>
    </Card>
  );
}

function NewQuestionForm({
  examId,
  courseId,
}: {
  examId: string;
  courseId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [options, setOptions] = useState<QuestionOption[]>(emptyOptions());
  const [marks, setMarks] = useState(1);

  function setCorrect(idx: number) {
    setOptions((opts) => opts.map((o, i) => ({ ...o, isCorrect: i === idx })));
  }
  function setLabel(idx: number, label: string) {
    setOptions((opts) => opts.map((o, i) => (i === idx ? { ...o, label } : o)));
  }
  function addOption() {
    if (options.length >= 6) return;
    setOptions((opts) => [...opts, { label: "", isCorrect: false }]);
  }
  function removeOption(idx: number) {
    if (options.length <= 2) return;
    setOptions((opts) => {
      const next = opts.filter((_, i) => i !== idx);
      if (!next.some((o) => o.isCorrect)) next[0].isCorrect = true;
      return next;
    });
  }

  function onAdd() {
    const err = isValid(text, options);
    if (err) {
      toast.error(err);
      return;
    }
    startTransition(async () => {
      const r = await createQuestion({
        examId,
        courseId,
        question: text,
        options: options
          .map((o) => ({ label: o.label.trim(), isCorrect: o.isCorrect }))
          .filter((o) => o.label.length > 0),
        marks: Number(marks),
      });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success("Question added");
      setText("");
      setOptions(emptyOptions());
      setMarks(1);
      router.refresh();
    });
  }

  return (
    <Card className="border-dashed bg-transparent p-5 shadow-none">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        <Plus className="size-3.5" />
        Add a new question
      </div>
      <QuestionForm
        text={text}
        setText={setText}
        options={options}
        setLabel={setLabel}
        setCorrect={setCorrect}
        addOption={addOption}
        removeOption={removeOption}
        marks={marks}
        setMarks={setMarks}
      />
      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          onClick={onAdd}
          disabled={pending}
          className="rounded-xl"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Add question
        </Button>
      </div>
    </Card>
  );
}

function QuestionForm({
  text,
  setText,
  options,
  setLabel,
  setCorrect,
  addOption,
  removeOption,
  marks,
  setMarks,
  index,
}: {
  text: string;
  setText: (v: string) => void;
  options: QuestionOption[];
  setLabel: (idx: number, label: string) => void;
  setCorrect: (idx: number) => void;
  addOption: () => void;
  removeOption: (idx: number) => void;
  marks: number;
  setMarks: (n: number) => void;
  index?: number;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">
          {typeof index === "number" ? `Question ${index + 1}` : "Question"}
        </Label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Which of the following best describes…"
          className="rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">Options</Label>
        <p className="text-[11px] text-muted-foreground">
          Click the radio to mark the single correct answer. Leave an empty
          row to use fewer options (minimum 2).
        </p>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCorrect(i)}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl border transition-colors hover:bg-secondary"
                aria-label={
                  opt.isCorrect ? "Marked correct" : "Mark as correct"
                }
              >
                {opt.isCorrect ? (
                  <CheckCircle2
                    className="size-4 text-[#8CC63F]"
                    strokeWidth={2.5}
                  />
                ) : (
                  <Circle className="size-4 text-muted-foreground" />
                )}
              </button>
              <Input
                value={opt.label}
                onChange={(e) => setLabel(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="h-9 rounded-xl"
              />
              {options.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeOption(i)}
                  aria-label="Remove option"
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        {options.length < 6 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addOption}
            className="rounded-xl"
          >
            <Plus className="size-3.5" />
            Add another option
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Marks</Label>
        <Input
          type="number"
          min={1}
          max={100}
          value={marks}
          onChange={(e) => setMarks(Number(e.target.value || 0))}
          className="h-9 w-24 rounded-xl"
        />
      </div>
    </div>
  );
}
