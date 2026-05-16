"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncStripeAction } from "./actions";

export function SyncStripeButton() {
  const [pending, startTransition] = useTransition();

  function sync() {
    startTransition(async () => {
      const r = await syncStripeAction();
      if (r.ok) toast.success(r.message);
      else toast.warning(r.message);
    });
  }

  return (
    <Button variant="outline" onClick={sync} disabled={pending} className="rounded-xl">
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <RefreshCw className="size-4" />
      )}
      Sync from Stripe
    </Button>
  );
}
