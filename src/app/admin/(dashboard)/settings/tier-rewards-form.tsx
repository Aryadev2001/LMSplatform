"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setTierReward } from "./actions";

type Tier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
const TIERS: { tier: Tier; label: string }[] = [
  { tier: "BRONZE", label: "Bronze · 1 referral" },
  { tier: "SILVER", label: "Silver · 5 referrals" },
  { tier: "GOLD", label: "Gold · 15 referrals" },
  { tier: "PLATINUM", label: "Platinum · 30 referrals" },
];

const NONE = "__none__";

export function TierRewardsForm({
  courses,
  current,
}: {
  courses: { id: string; name: string }[];
  current: Record<string, string | null>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyTier, setBusyTier] = useState<Tier | null>(null);

  function onChange(tier: Tier, value: string) {
    setBusyTier(tier);
    startTransition(async () => {
      const r = await setTierReward({
        tier,
        courseId: value === NONE ? null : value,
      });
      setBusyTier(null);
      if (r.success) {
        toast.success(`${tier} reward updated`);
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  if (courses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add courses to your catalog first — then you can map them to tiers.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {TIERS.map(({ tier, label }) => (
        <div key={tier} className="grid items-center gap-2 sm:grid-cols-[180px_1fr]">
          <Label className="text-xs font-medium">{label}</Label>
          <Select
            value={current[tier] ?? NONE}
            onValueChange={(v) => v && onChange(tier, v)}
            disabled={pending && busyTier === tier}
          >
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="No reward" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>— No reward</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {pending && busyTier === tier && (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          )}
        </div>
      ))}
    </div>
  );
}
