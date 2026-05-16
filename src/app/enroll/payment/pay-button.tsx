"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeMockPayment } from "../actions";

export function PayButton({
  enrollmentId,
  amountLabel,
  email,
}: {
  enrollmentId: string;
  amountLabel: string;
  email: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function pay() {
    setPending(true);
    const r = await completeMockPayment(enrollmentId);
    if (r.success) {
      router.push(`/enroll/success?email=${encodeURIComponent(r.email)}`);
    } else {
      toast.error(r.error);
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={pay}
        disabled={pending}
        className="h-12 w-full rounded-xl text-sm font-semibold text-white"
        style={{ background: "linear-gradient(135deg, #8CC63F 0%, #1AADE0 100%)" }}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Processing payment…
          </>
        ) : (
          <>
            <Lock className="size-4" /> Pay {amountLabel}
          </>
        )}
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        Test mode — no real charge. Access for {email} is granted instantly on success.
      </p>
    </div>
  );
}
