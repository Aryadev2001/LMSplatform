"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles, Building2, Award, ExternalLink } from "lucide-react";

type Tier = "basic" | "standard" | "premium";

interface BillingActionsProps {
  currentTier: Tier;
  hasSubscription: boolean;
  configured: boolean;
}

export function BillingActions({
  currentTier,
  hasSubscription,
  configured,
}: BillingActionsProps) {
  const router = useRouter();
  const [pendingTier, setPendingTier] = useState<"standard" | "premium" | null>(
    null,
  );
  const [portalPending, setPortalPending] = useState(false);

  async function upgrade(tier: "standard" | "premium") {
    if (!configured) {
      toast.error(
        "Platform billing is not configured yet. Ask the platform team to set STRIPE_PLATFORM_SECRET_KEY + the price IDs in Vercel.",
      );
      return;
    }
    setPendingTier(tier);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? `Could not start checkout (${res.status})`);
        return;
      }
      // Stripe Checkout is a different origin — full page nav.
      window.location.href = data.url;
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not reach the checkout API",
      );
    } finally {
      setPendingTier(null);
    }
  }

  async function openPortal() {
    if (!configured) {
      toast.error("Billing not configured.");
      return;
    }
    setPortalPending(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? `Could not open portal (${res.status})`);
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Portal error");
    } finally {
      setPortalPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Upgrade cards */}
      {currentTier !== "premium" && (
        <div className="grid gap-4 md:grid-cols-2">
          {currentTier === "basic" && (
            <TierCard
              icon={Building2}
              name="Standard"
              price="$49"
              cadence="/month"
              accent="var(--ed-blue)"
              perks={[
                "Custom subdomain on eurodigital.coach",
                "Per-course voucher codes",
                "Connect your own Stripe / Razorpay",
                "48h email support",
              ]}
              cta="Upgrade to Standard"
              pending={pendingTier === "standard"}
              disabled={!configured}
              onClick={() => upgrade("standard")}
            />
          )}
          <TierCard
            icon={Award}
            name="Premium"
            price="$149"
            cadence="/month"
            accent="var(--ed-green)"
            highlight={currentTier === "standard"}
            perks={[
              "Everything in Standard",
              "Your own custom domain",
              "AI Services & Diagnostics access",
              "White-label storefront",
              "Featured slot + priority support",
            ]}
            cta="Upgrade to Premium"
            pending={pendingTier === "premium"}
            disabled={!configured}
            onClick={() => upgrade("premium")}
          />
        </div>
      )}

      {/* Customer portal */}
      {hasSubscription && (
        <div
          className="flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: "var(--ed-line)" }}
        >
          <div className="min-w-0">
            <div className="text-sm font-bold" style={{ color: "var(--ed-ink)" }}>
              Manage your subscription
            </div>
            <p className="mt-0.5 text-xs" style={{ color: "var(--ed-mute)" }}>
              Update payment method, switch plan, view invoices, or cancel — all
              from Stripe&apos;s secure customer portal.
            </p>
          </div>
          <button
            type="button"
            onClick={openPortal}
            disabled={portalPending || !configured}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold transition-colors hover:bg-secondary disabled:opacity-60"
            style={{ borderColor: "var(--ed-line)", color: "var(--ed-ink)" }}
          >
            {portalPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ExternalLink className="size-4" />
            )}
            Open Stripe portal
          </button>
        </div>
      )}

      {!configured && (
        <div
          className="rounded-xl border border-dashed p-3 text-[11px] leading-relaxed"
          style={{ borderColor: "var(--ed-line)", color: "var(--ed-mute)" }}
        >
          <strong>Billing is not configured yet.</strong> The platform team
          needs to set these env vars in Vercel before checkout can run:{" "}
          <span className="font-mono">STRIPE_PLATFORM_SECRET_KEY</span>,{" "}
          <span className="font-mono">STRIPE_PLATFORM_WEBHOOK_SECRET</span>,{" "}
          <span className="font-mono">STRIPE_PRICE_STANDARD</span>,{" "}
          <span className="font-mono">STRIPE_PRICE_PREMIUM</span>.
        </div>
      )}
    </div>
  );
}

function TierCard({
  icon: Icon,
  name,
  price,
  cadence,
  perks,
  cta,
  pending,
  disabled,
  onClick,
  accent,
  highlight,
}: {
  icon: typeof Sparkles;
  name: string;
  price: string;
  cadence: string;
  perks: string[];
  cta: string;
  pending: boolean;
  disabled: boolean;
  onClick: () => void;
  accent: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-white p-5 ${highlight ? "ring-2" : ""}`}
      style={{
        borderColor: "var(--ed-line)",
        ...(highlight ? { boxShadow: `0 0 0 2px ${accent}` } : {}),
      }}
    >
      <div
        className="mb-3 flex size-10 items-center justify-center rounded-xl text-white"
        style={{ background: accent }}
      >
        <Icon className="size-5" />
      </div>
      <div className="text-sm font-extrabold" style={{ color: "var(--ed-ink)" }}>
        {name}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-3xl font-extrabold" style={{ color: "var(--ed-ink)" }}>
          {price}
        </span>
        <span className="text-xs" style={{ color: "var(--ed-mute)" }}>
          {cadence}
        </span>
      </div>
      <ul className="mt-3 space-y-1.5 text-xs" style={{ color: "var(--ed-ink-2)" }}>
        {perks.map((p) => (
          <li key={p} className="flex items-start gap-1.5">
            <span
              className="mt-1 size-1.5 shrink-0 rounded-full"
              style={{ background: accent }}
            />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClick}
        disabled={pending || disabled}
        className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: accent }}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {cta}
      </button>
    </div>
  );
}
