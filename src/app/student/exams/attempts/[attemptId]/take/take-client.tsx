"use client";

import { useEffect, useRef, useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Clock,
  Loader2,
  Send,
  CheckCircle2,
  Circle,
  AlertCircle,
} from "lucide-react";
import { submitAttempt } from "../../../actions";

export interface TakeQuestion {
  id: string;
  question: string;
  /** Display order may be shuffled; `originalIndex` is the stable value we
   *  submit + grade against (the option's position in the stored array). */
  options: { label: string; originalIndex: number }[];
  marks: number;
}

interface Props {
  attemptId: string;
  examTitle: string;
  courseName: string;
  durationMinutes: number;
  deadlineMs: number;
  questions: TakeQuestion[];
  initialAnswers: Record<string, number>;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "00:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function TakeExamClient({
  attemptId,
  examTitle,
  courseName,
  durationMinutes,
  deadlineMs,
  questions,
  initialAnswers,
}: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers);
  const [pending, startTransition] = useTransition();
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, deadlineMs - Date.now()),
  );
  const autoSubmittedRef = useRef(false);

  // Countdown — recomputes from absolute deadlineMs each tick so suspended
  // tabs / device sleep / clock jumps can't extend the exam.
  useEffect(() => {
    const id = window.setInterval(() => {
      setRemainingMs(Math.max(0, deadlineMs - Date.now()));
    }, 1000);
    return () => window.clearInterval(id);
  }, [deadlineMs]);

  // Beforeunload warning — only while there are unanswered questions.
  useEffect(() => {
    const unanswered = questions.some((q) => !(q.id in answers));
    if (!unanswered) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [answers, questions]);

  function submit(opts?: { reason?: "manual" | "auto" }) {
    if (autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    startTransition(async () => {
      const r = await submitAttempt({ attemptId, answers });
      if (!r.success) {
        autoSubmittedRef.current = false;
        toast.error(r.error);
        return;
      }
      toast.success(
        opts?.reason === "auto"
          ? "Time's up — your answers were auto-submitted."
          : "Exam submitted",
      );
      router.push(`/student/exams/attempts/${attemptId}`);
    });
  }

  // Auto-submit when the timer hits zero.
  useEffect(() => {
    if (remainingMs > 0) return;
    if (autoSubmittedRef.current) return;
    submit({ reason: "auto" });
    // submit is stable enough — running once when remainingMs first hits 0.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs]);

  const answered = useMemo(
    () => questions.filter((q) => q.id in answers).length,
    [questions, answers],
  );

  const lowTime = remainingMs > 0 && remainingMs <= 60_000;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-32">
      {/* Sticky header with timer */}
      <header
        className="sticky top-0 z-10 -mx-6 border-b bg-background/95 px-6 py-4 backdrop-blur"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {courseName}
            </div>
            <h1 className="truncate text-lg font-extrabold">{examTitle}</h1>
          </div>
          <div
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold tabular-nums ${
              lowTime
                ? "border-destructive/50 bg-destructive/10 text-destructive"
                : ""
            }`}
            aria-live="polite"
          >
            <Clock className="size-4" />
            {formatRemaining(remainingMs)}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {answered}/{questions.length} answered
          </span>
          {answered < questions.length && remainingMs > 0 && (
            <>
              <span>·</span>
              <span>
                {questions.length - answered} unanswered — you can submit
                anyway.
              </span>
            </>
          )}
        </div>
      </header>

      {lowTime && remainingMs > 0 && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
          <span>
            Less than a minute left — your current answers will be
            auto-submitted when the timer hits zero.
          </span>
        </div>
      )}

      {questions.map((q, i) => (
        <QuestionCard
          key={q.id}
          index={i}
          q={q}
          selected={answers[q.id]}
          onSelect={(idx) => setAnswers((a) => ({ ...a, [q.id]: idx }))}
        />
      ))}

      {/* Sticky submit footer */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {answered === questions.length ? (
              <span className="font-semibold text-foreground">
                Ready to submit — all questions answered.
              </span>
            ) : (
              <span>
                {questions.length - answered} unanswered. You can still submit.
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => submit({ reason: "manual" })}
            disabled={pending || remainingMs <= 0}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-foreground px-5 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Submit exam
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionCard({
  q,
  index,
  selected,
  onSelect,
}: {
  q: TakeQuestion;
  index: number;
  selected: number | undefined;
  onSelect: (idx: number) => void;
}) {
  return (
    <article className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        <span>Q{index + 1}</span>
        <span>·</span>
        <span>
          {q.marks} mark{q.marks === 1 ? "" : "s"}
        </span>
      </div>
      <p className="mt-2 text-sm font-semibold leading-snug">{q.question}</p>
      <ul className="mt-4 space-y-2">
        {q.options.map((o) => {
          const active = selected === o.originalIndex;
          return (
            <li key={o.originalIndex}>
              <button
                type="button"
                onClick={() => onSelect(o.originalIndex)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                  active
                    ? "border-foreground bg-foreground/5"
                    : "border-input hover:bg-secondary"
                }`}
                aria-pressed={active}
              >
                {active ? (
                  <CheckCircle2
                    className="size-4 shrink-0 text-foreground"
                    strokeWidth={2.5}
                  />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span>{o.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
