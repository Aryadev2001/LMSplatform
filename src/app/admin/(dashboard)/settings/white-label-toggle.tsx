"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Lock, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { setWhiteLabelActive } from "./actions";

export function WhiteLabelToggle({
  initialEnabled,
  unlocked,
  tenantSlug,
}: {
  initialEnabled: boolean;
  /** True when the tenant's tier (or super-admin override) grants the
   *  white_label feature. False = the toggle is informational only. */
  unlocked: boolean;
  tenantSlug: string | null;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();

  function onChange(next: boolean) {
    if (!unlocked) {
      toast.error("White-label is a Premium feature. Ask the platform team to grant it or upgrade your plan.");
      return;
    }
    const prev = enabled;
    setEnabled(next);
    startTransition(async () => {
      const r = await setWhiteLabelActive(next);
      if (!r.success) {
        setEnabled(prev);
        toast.error(r.error);
        return;
      }
      toast.success(
        next
          ? "Platform branding hidden on your storefront"
          : "Platform branding restored on your storefront",
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border p-4">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: unlocked ? "rgba(0,174,239,0.08)" : "var(--ed-bg)",
            color: unlocked ? "var(--ed-blue)" : "var(--ed-mute)",
          }}
        >
          {unlocked ? <EyeOff className="size-4" /> : <Lock className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Label htmlFor="white-label" className="text-sm font-bold">
              Hide eurodigital.coach branding
            </Label>
            {!unlocked && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Premium
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            When on, the platform top-nav and footer are hidden on{" "}
            <span className="font-mono">
              /institute/{tenantSlug ?? "your-slug"}
            </span>{" "}
            so visitors see a tenant-only storefront experience. The course
            content, hero, tabs and your branding are unchanged.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pending && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
          <Checkbox
            id="white-label"
            checked={enabled}
            onCheckedChange={(c) => onChange(c === true)}
            disabled={pending || !unlocked}
          />
        </div>
      </div>
      {!unlocked && (
        <p className="text-[11px] text-muted-foreground">
          White-label is unlocked at the <strong>Premium</strong> tier, or via a
          manual grant from the super-admin team.
        </p>
      )}
    </div>
  );
}
