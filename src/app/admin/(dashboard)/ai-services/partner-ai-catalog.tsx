"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Coins, Store, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AI_SERVICES,
  formatAiPrice,
  formatAiPartnerPrice,
  partnerPriceCents,
  type AiService,
  type AiCategory,
} from "@/lib/ai-services";

const FILTERS = [
  "All",
  "For Resale",
  "Career",
  "Learning",
  "Productivity",
  "Developer",
] as const;

const CAT_COLOR: Record<AiCategory, string> = {
  Career: "var(--ed-indigo)",
  Learning: "var(--ed-blue)",
  Productivity: "var(--ed-teal)",
  Developer: "var(--ed-pink)",
};

export function PartnerAiCatalog({ pointsBalance }: { pointsBalance: number }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [resell, setResell] = useState<AiService | null>(null);
  const [retail, setRetail] = useState("");
  const [commission, setCommission] = useState("25");

  const list = AI_SERVICES.filter((s) => {
    if (filter === "All") return true;
    if (filter === "For Resale") return s.resellable;
    return s.category === filter;
  });

  function buyOps(s: AiService) {
    toast.success(
      `${s.name} added for operations — checkout opens with the cart screen.`,
    );
  }

  function submitResell() {
    if (!resell) return;
    const price = Number(retail);
    if (!price || price <= 0) {
      toast.error("Enter a valid retail price.");
      return;
    }
    // No ai_service_partner_resell table yet (Phase-2 europic.ai schema) —
    // honest placeholder, persists when that integration lands.
    toast.success(
      `Reseller set: ${resell.name} → $${price} retail, ${commission}% commission. Goes live with the europic.ai integration.`,
    );
    setResell(null);
    setRetail("");
    setCommission("25");
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5" style={{ color: "var(--ed-blue)" }} />
          <h2 className="text-lg font-bold tracking-tight">
            AI Services — operations &amp; resell
            <span className="ml-2 text-xs font-medium text-muted-foreground">
              powered by europic.ai
            </span>
          </h2>
        </div>
        <div
          className="inline-flex items-center gap-2 self-start rounded-full px-3.5 py-1.5 text-sm font-semibold text-white"
          style={{ background: "var(--ed-green-dark)" }}
        >
          <Coins className="size-4" />
          {pointsBalance.toLocaleString()} reward points
        </div>
      </div>

      <div
        className="mb-6 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-medium"
        style={{ borderColor: "var(--ed-line)", color: "var(--ed-ink-2)" }}
      >
        <Zap className="size-4" style={{ color: "var(--ed-warn)" }} />
        Partner bonus: <strong>2× reward points</strong> on every AI service +
        discounted operations pricing + resell to your students with your
        branding.
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors"
              style={{
                borderColor: "var(--ed-line)",
                background: active ? "var(--ed-ink)" : "white",
                color: active ? "white" : "var(--ed-ink-2)",
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((s) => (
          <div
            key={s.id}
            className="flex flex-col overflow-hidden rounded-2xl border bg-white"
            style={{ borderColor: "var(--ed-line)" }}
          >
            <div
              className="relative flex h-24 items-center justify-center text-3xl"
              style={{ background: "var(--ed-gradient)" }}
            >
              <div className="absolute inset-0" style={{ background: "var(--ed-halftone)" }} />
              <span className="relative">{s.icon}</span>
              <span
                className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                style={{ background: "var(--ed-ink)" }}
              >
                2× pts
              </span>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-center justify-between">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                  style={{ background: CAT_COLOR[s.category] }}
                >
                  {s.category}
                </span>
                {s.resellable && (
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--ed-mute)" }}>
                    Resellable
                  </span>
                )}
              </div>
              <h3 className="mt-2 text-sm font-bold leading-snug">{s.name}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {s.description}
              </p>
              <div className="mt-1 text-xs font-bold" style={{ color: "var(--ed-green-dark)" }}>
                +{s.partnerRewardPoints} pts (2×)
              </div>

              <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--ed-line)" }}>
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-extrabold">
                    {formatAiPartnerPrice(s)}
                  </span>
                  <span className="text-[11px] text-muted-foreground line-through">
                    {formatAiPrice(s)}
                  </span>
                  <span className="text-[10px] font-semibold" style={{ color: "var(--ed-green-dark)" }}>
                    partner price
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => buyOps(s)}
                    className="flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition-colors hover:bg-[var(--ed-bg)]"
                    style={{ borderColor: "var(--ed-line)", color: "var(--ed-ink)" }}
                  >
                    Get for ops
                  </button>
                  {s.resellable && (
                    <button
                      type="button"
                      onClick={() => {
                        setResell(s);
                        setRetail(String(Math.round(s.priceCents / 100)));
                      }}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-white"
                      style={{ background: "var(--ed-gradient)" }}
                    >
                      <Store className="size-3.5" /> Resell
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Become a Reseller modal */}
      <Dialog open={!!resell} onOpenChange={(o) => !o && setResell(null)}>
        <DialogContent className="sm:max-w-md">
          {resell && (
            <>
              <DialogHeader>
                <DialogTitle>Resell “{resell.name}”</DialogTitle>
                <DialogDescription>
                  Offer this to your students with your own branding. You set
                  the retail price; you earn your commission on each sale.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-xl border px-4 py-3 text-xs" style={{ borderColor: "var(--ed-line)", color: "var(--ed-ink-2)" }}>
                  Your cost (partner price):{" "}
                  <strong>{formatAiPartnerPrice(resell)}</strong> · base points
                  2× = <strong>+{resell.partnerRewardPoints}</strong>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Your retail price (USD)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={retail}
                    onChange={(e) => setRetail(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Cost {(partnerPriceCents(resell) / 100).toFixed(0)} · suggested ≥ student price{" "}
                    {(resell.priceCents / 100).toFixed(0)}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Your commission %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Default 20–30%. Resold service shows on your storefront with
                    your branding.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setResell(null)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitResell}
                  className="rounded-xl text-white"
                  style={{ background: "var(--ed-gradient)" }}
                >
                  Enable resell
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
