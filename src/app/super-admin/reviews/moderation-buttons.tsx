"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EyeOff, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hideReview, unhideReview } from "./actions";

export function HideReviewButton({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  function submit() {
    startTransition(async () => {
      const r = await hideReview({ reviewId, reason });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success("Review hidden from public");
      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-xs"
      >
        <EyeOff className="size-3.5" /> Hide
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value.slice(0, 240))}
        placeholder="Reason (optional, audit-logged)"
        className="h-8 w-56 rounded-lg border border-input bg-background px-3 text-xs"
        maxLength={240}
      />
      <Button
        type="button"
        size="sm"
        onClick={submit}
        disabled={pending}
        className="h-8 rounded-lg text-xs"
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <EyeOff className="size-3.5" />
        )}
        Confirm hide
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => {
          setOpen(false);
          setReason("");
        }}
        className="h-8 text-xs"
      >
        Cancel
      </Button>
    </div>
  );
}

export function UnhideReviewButton({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function onClick() {
    startTransition(async () => {
      const r = await unhideReview(reviewId);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success("Review restored");
      router.refresh();
    });
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={pending}
      className="text-xs"
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Eye className="size-3.5" />
      )}
      Restore
    </Button>
  );
}
