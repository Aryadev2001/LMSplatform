"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { completeMockPayment } from "../actions";

export function PayButton({
  enrollmentId,
  amountLabel,
  email,
  referralCode,
  redeem,
  isFree,
}: {
  enrollmentId: string;
  amountLabel: string;
  email: string;
  referralCode?: string | null;
  redeem?: { points: number; discountLabel: string; netLabel: string } | null;
  /** Free course — hide the card UI + the "Pay" wording. */
  isFree?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [usePoints, setUsePoints] = useState(false);

  async function pay() {
    setPending(true);
    const r = await completeMockPayment(enrollmentId, {
      referralCode: referralCode ?? undefined,
      redeemPoints: usePoints,
    });
    if (r.success) {
      router.push(`/enroll/success?email=${encodeURIComponent(r.email)}`);
    } else {
      toast.error(r.error);
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      {redeem && (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 bg-secondary/40 p-3">
          <Checkbox
            checked={usePoints}
            onCheckedChange={(c) => setUsePoints(c === true)}
            className="mt-0.5"
          />
          <span className="text-xs">
            <span className="font-medium text-foreground">
              Use {redeem.points} points (−{redeem.discountLabel})
            </span>
            <br />
            <span className="text-muted-foreground">
              You&apos;ll pay {redeem.netLabel} instead of {amountLabel}.
            </span>
          </span>
        </label>
      )}

      <Button
        onClick={pay}
        disabled={pending}
        className="h-12 w-full rounded-xl text-sm font-semibold text-white"
        style={{ background: "linear-gradient(135deg, #8CC63F 0%, #1AADE0 100%)" }}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {isFree ? "Enrolling…" : "Processing payment…"}
          </>
        ) : isFree ? (
          <>
            <Sparkles className="size-4" />
            Complete free enrollment
          </>
        ) : (
          <>
            <Lock className="size-4" />
            Pay {redeem && usePoints ? redeem.netLabel : amountLabel}
          </>
        )}
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        {isFree
          ? `Access for ${email} is granted instantly. Magic-link sign-in emailed.`
          : `Test mode — no real charge. Access for ${email} is granted instantly on success.`}
      </p>
    </div>
  );
}
