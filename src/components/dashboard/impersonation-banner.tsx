"use client";

import { useTransition } from "react";
import { ShieldAlert, LogOut, Loader2 } from "lucide-react";
import { stopImpersonation } from "@/app/super-admin/actions";

export function ImpersonationBanner({ tenantName }: { tenantName: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950">
      <span className="flex items-center gap-2">
        <ShieldAlert className="size-4" />
        Viewing <span className="font-extrabold">{tenantName}</span> as
        super-admin — actions are recorded.
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await stopImpersonation();
          })
        }
        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-950 px-3 py-1.5 text-xs font-bold text-amber-50 transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <LogOut className="size-3.5" />
        )}
        Exit
      </button>
    </div>
  );
}
