"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, Loader2, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitReview, deleteMyReview } from "./review-actions";

export interface ReviewFormProps {
  courseId: string;
  initial: { rating: number; body: string } | null;
}

export function ReviewForm({ courseId, initial }: ReviewFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState<number>(initial?.rating ?? 0);
  const [hover, setHover] = useState<number>(0);
  const [body, setBody] = useState<string>(initial?.body ?? "");
  const [pending, startTransition] = useTransition();

  function onSubmit() {
    if (rating < 1 || rating > 5) {
      toast.error("Pick a star rating from 1 to 5.");
      return;
    }
    startTransition(async () => {
      const r = await submitReview({ courseId, rating, body });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success(initial ? "Review updated" : "Thanks — review posted");
      router.refresh();
    });
  }

  function onDelete() {
    if (!initial) return;
    if (!window.confirm("Delete your review for this course?")) return;
    startTransition(async () => {
      const r = await deleteMyReview(courseId);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      setRating(0);
      setBody("");
      toast.success("Review deleted");
      router.refresh();
    });
  }

  const shown = hover || rating;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {initial ? "Your review" : "Leave a review"}
        </div>
        <h3 className="mt-1 text-base font-bold">
          {initial
            ? "Update your rating and notes"
            : "How was this course?"}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Your rating helps other learners decide. You can edit or delete it
          any time.
        </p>
      </div>

      <div
        className="flex items-center gap-1"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = shown >= n;
          return (
            <button
              key={n}
              type="button"
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              className="rounded-md p-1 transition-transform hover:scale-110"
            >
              <Star
                className={`size-7 ${filled ? "fill-current" : ""}`}
                style={{ color: filled ? "#F59E0B" : "var(--ed-mute, #94A3B8)" }}
                strokeWidth={1.5}
              />
            </button>
          );
        })}
        <span className="ml-2 text-sm font-bold tabular-nums">
          {shown > 0 ? `${shown}/5` : "Pick a rating"}
        </span>
      </div>

      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="What did you like? What could be better? (optional)"
        className="rounded-xl"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] text-muted-foreground">
          {body.length} / 2000
        </div>
        <div className="flex items-center gap-2">
          {initial && (
            <Button
              type="button"
              variant="outline"
              onClick={onDelete}
              disabled={pending}
              className="h-10 rounded-xl"
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          )}
          <Button
            type="button"
            onClick={onSubmit}
            disabled={pending || rating === 0}
            className="h-10 rounded-xl"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {initial ? "Save changes" : "Post review"}
          </Button>
        </div>
      </div>
    </div>
  );
}
