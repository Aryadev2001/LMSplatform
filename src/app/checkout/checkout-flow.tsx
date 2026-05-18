"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Lock, ChevronRight, ChevronLeft } from "lucide-react";
import { useCart, taxRateFor } from "@/lib/cart";
import { formatCurrency } from "@/lib/format";
import { placeOrder } from "./actions";

const COUNTRIES = [
  { code: "AE", label: "United Arab Emirates" },
  { code: "IN", label: "India" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "OTHER", label: "Other" },
];

export function CheckoutFlow({ pointsBalance }: { pointsBalance: number }) {
  const router = useRouter();
  const { items, clear } = useCart();
  const [step, setStep] = useState(1);
  const [pending, startTransition] = useTransition();

  const [bill, setBill] = useState({
    name: "",
    email: "",
    country: "AE",
    address: "",
    taxId: "",
  });
  const [usePts, setUsePts] = useState(0);

  const currency = items[0]?.currency ?? "USD";
  const subtotal = items.reduce((s, i) => s + i.priceCents, 0);
  const tax = taxRateFor(bill.country);
  const taxCents = Math.round(subtotal * tax.rate);

  // Points: our engine = 1pt = ₹1 (100 minor units); cap 30% of subtotal.
  const maxPtsCents = Math.floor(subtotal * 0.3);
  const maxPts = Math.min(pointsBalance, Math.floor(maxPtsCents / 100));
  const ptsCents = usePts * 100;
  const total = Math.max(0, subtotal + taxCents - ptsCents);

  const singleInstitute = useMemo(
    () => items.every((i) => i.instituteSlug === items[0]?.instituteSlug),
    [items],
  );

  function submit() {
    startTransition(async () => {
      const r = await placeOrder({
        programIds: items.map((i) => i.programId),
        billingCountry: bill.country,
        redeemPoints: usePts > 0 && singleInstitute,
      });
      if (r.success) {
        clear();
        router.push(
          `/checkout/success?ref=${encodeURIComponent(r.orderRef)}&items=${r.items}`,
        );
      } else {
        toast.error(r.error);
      }
    });
  }

  if (items.length === 0) {
    return (
      <div
        className="rounded-2xl border border-dashed py-16 text-center text-sm"
        style={{ borderColor: "var(--ed-line)", color: "var(--ed-mute)" }}
      >
        Your cart is empty.{" "}
        <a href="/explore" className="font-semibold underline">
          Explore courses
        </a>
      </div>
    );
  }

  const steps = ["Cart", "Billing", "Payment"];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div>
        {/* Stepper */}
        <div className="mb-6 flex items-center gap-2 text-sm font-semibold">
          {steps.map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              <span
                className="flex size-6 items-center justify-center rounded-full text-xs"
                style={{
                  background: step >= i + 1 ? "var(--ed-gradient)" : "white",
                  color: step >= i + 1 ? "white" : "var(--ed-mute)",
                  border: step >= i + 1 ? "none" : "1px solid var(--ed-line)",
                }}
              >
                {i + 1}
              </span>
              <span style={{ color: step === i + 1 ? "var(--ed-ink)" : "var(--ed-mute)" }}>
                {s}
              </span>
              {i < 2 && <ChevronRight className="size-4" style={{ color: "var(--ed-line)" }} />}
            </span>
          ))}
        </div>

        <div className="rounded-2xl border bg-white p-6" style={{ borderColor: "var(--ed-line)" }}>
          {step === 1 && (
            <div className="space-y-3">
              {items.map((i) => (
                <div key={i.programId} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-bold" style={{ color: "var(--ed-ink)" }}>{i.title}</div>
                    <div className="text-xs" style={{ color: "var(--ed-mute)" }}>{i.instituteName}</div>
                  </div>
                  <span className="font-bold">{formatCurrency(i.priceCents, i.currency)}</span>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {(
                [
                  ["Full name", "name", "Jane Doe"],
                  ["Email", "email", "you@example.com"],
                  ["Address", "address", "Street, city, postal"],
                ] as const
              ).map(([label, key, ph]) => (
                <label key={key} className="block">
                  <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ed-ink-2)" }}>{label}</span>
                  <input
                    className="h-10 w-full rounded-xl border px-3 text-sm outline-none"
                    style={{ borderColor: "var(--ed-line)" }}
                    placeholder={ph}
                    value={bill[key]}
                    onChange={(e) => setBill((b) => ({ ...b, [key]: e.target.value }))}
                  />
                </label>
              ))}
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ed-ink-2)" }}>Billing country</span>
                <select
                  className="h-10 w-full rounded-xl border bg-white px-3 text-sm"
                  style={{ borderColor: "var(--ed-line)" }}
                  value={bill.country}
                  onChange={(e) => setBill((b) => ({ ...b, country: e.target.value }))}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ed-ink-2)" }}>
                  VAT TRN / GSTIN (optional, B2B)
                </span>
                <input
                  className="h-10 w-full rounded-xl border px-3 text-sm outline-none"
                  style={{ borderColor: "var(--ed-line)" }}
                  value={bill.taxId}
                  onChange={(e) => setBill((b) => ({ ...b, taxId: e.target.value }))}
                />
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-sm font-bold" style={{ color: "var(--ed-ink)" }}>
                Payment method
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(bill.country === "IN"
                  ? ["UPI", "Cards", "Net Banking", "Wallets"]
                  : ["Card", "Apple Pay", "Google Pay", "Bank Transfer"]
                ).map((m) => (
                  <div
                    key={m}
                    className="rounded-xl border px-3 py-2.5 text-center font-semibold"
                    style={{ borderColor: "var(--ed-line)", color: "var(--ed-ink-2)" }}
                  >
                    {m}
                  </div>
                ))}
              </div>
              {maxPts > 0 && (
                <div className="rounded-xl border p-4" style={{ borderColor: "var(--ed-line)" }}>
                  <div className="flex items-center justify-between text-xs font-semibold" style={{ color: "var(--ed-ink-2)" }}>
                    <span>Use reward points</span>
                    <span>{usePts} / {maxPts} pts</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={maxPts}
                    value={usePts}
                    onChange={(e) => setUsePts(Number(e.target.value))}
                    className="mt-2 w-full"
                  />
                  {!singleInstitute && (
                    <p className="mt-1 text-[11px]" style={{ color: "var(--ed-rose)" }}>
                      Points apply only to single-institute carts.
                    </p>
                  )}
                </div>
              )}
              <div
                className="rounded-xl border px-4 py-3 text-[11px]"
                style={{ borderColor: "var(--ed-line)", color: "var(--ed-mute)" }}
              >
                Test mode — no real charge. Live Stripe/Razorpay processing is
                the dedicated next build. Your enrollment + access are granted
                immediately.
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              disabled={step === 1 || pending}
              onClick={() => setStep((x) => x - 1)}
              className="inline-flex items-center gap-1 text-sm font-semibold disabled:opacity-40"
              style={{ color: "var(--ed-ink-2)" }}
            >
              <ChevronLeft className="size-4" /> Back
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((x) => x + 1)}
                className="inline-flex items-center gap-1 rounded-xl px-6 py-2.5 text-sm font-bold text-white"
                style={{ background: "var(--ed-gradient)" }}
              >
                Continue <ChevronRight className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={submit}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                style={{ background: "var(--ed-gradient)" }}
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                Place order
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Order summary */}
      <aside
        className="h-fit rounded-2xl border bg-white p-6"
        style={{ borderColor: "var(--ed-line)" }}
      >
        <h3 className="text-sm font-bold" style={{ color: "var(--ed-ink)" }}>Order summary</h3>
        <dl className="mt-4 space-y-2 text-sm">
          <Row k={`Subtotal (${items.length})`} v={formatCurrency(subtotal, currency)} />
          {usePts > 0 && (
            <Row k={`Points (${usePts})`} v={`− ${formatCurrency(ptsCents, currency)}`} />
          )}
          <Row k={tax.label} v={formatCurrency(taxCents, currency)} />
          <div className="my-2 border-t" style={{ borderColor: "var(--ed-line)" }} />
          <div className="flex items-center justify-between">
            <dt className="font-bold" style={{ color: "var(--ed-ink)" }}>Total</dt>
            <dd className="text-xl font-extrabold" style={{ color: "var(--ed-blue)" }}>
              {formatCurrency(total, currency)}
            </dd>
          </div>
        </dl>
        <div
          className="mt-4 flex items-center gap-1.5 text-[11px]"
          style={{ color: "var(--ed-mute)" }}
        >
          <Lock className="size-3" /> Secure checkout
        </div>
      </aside>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt style={{ color: "var(--ed-mute)" }}>{k}</dt>
      <dd className="font-semibold" style={{ color: "var(--ed-ink)" }}>{v}</dd>
    </div>
  );
}
