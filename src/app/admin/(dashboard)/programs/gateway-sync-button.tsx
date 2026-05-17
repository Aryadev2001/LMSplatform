"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { syncProgramGateway } from "../actions";

export function GatewaySyncButton({ programId }: { programId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      title="Create / refresh this plan in your payment gateway"
      onClick={() =>
        startTransition(async () => {
          const r = await syncProgramGateway(programId);
          if (r.success) {
            toast.success("Plan synced to your payment gateway");
            router.refresh();
          } else {
            toast.error(r.error);
          }
        })
      }
      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <RefreshCw className="size-3.5" />
      )}
      Sync to gateway
    </button>
  );
}
