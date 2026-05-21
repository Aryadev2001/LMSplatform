"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Play } from "lucide-react";
import { startAttempt } from "../actions";

export function StartAttemptButton({
  examId,
  disabled,
  disabledReason,
}: {
  examId: string;
  disabled: boolean;
  disabledReason: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function onClick() {
    if (disabled) {
      if (disabledReason) toast.error(disabledReason);
      return;
    }
    startTransition(async () => {
      const r = await startAttempt(examId);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      router.push(`/student/exams/attempts/${r.attemptId}/take`);
    });
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending || disabled}
      className="inline-flex h-11 items-center gap-2 rounded-xl bg-foreground px-5 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
      Start exam
    </button>
  );
}
