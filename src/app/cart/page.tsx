"use client";

import Link from "next/link";
import { Trash2, ShoppingCart, ArrowRight } from "lucide-react";
import { EuroNav } from "@/components/euro/euro-nav";
import { EuroFooter } from "@/components/euro/euro-footer";
import { useCart } from "@/lib/cart";
import { formatCurrency } from "@/lib/format";

export default function CartPage() {
  const { items, remove } = useCart();
  const currency = items[0]?.currency ?? "USD";
  const mixed = items.some((i) => i.currency !== currency);
  const subtotal = items.reduce((s, i) => s + i.priceCents, 0);

  return (
    <div style={{ background: "var(--ed-bg)" }} className="min-h-screen">
      <EuroNav />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1
          className="mb-6 text-3xl font-extrabold tracking-tight"
          style={{ color: "var(--ed-ink)" }}
        >
          Your cart{" "}
          <span className="text-base font-semibold" style={{ color: "var(--ed-mute)" }}>
            ({items.length} {items.length === 1 ? "item" : "items"})
          </span>
        </h1>

        {items.length === 0 ? (
          <div
            className="flex flex-col items-center gap-4 rounded-2xl border border-dashed py-20 text-center"
            style={{ borderColor: "var(--ed-line)", color: "var(--ed-mute)" }}
          >
            <ShoppingCart className="size-10" />
            <p className="text-sm">Your cart is empty.</p>
            <Link
              href="/explore"
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-white"
              style={{ background: "var(--ed-gradient)" }}
            >
              Explore courses
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              {items.map((i) => (
                <div
                  key={i.programId}
                  className="flex items-center justify-between gap-4 rounded-2xl border bg-white p-4"
                  style={{ borderColor: "var(--ed-line)" }}
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--ed-blue)" }}>
                      {i.instituteName}
                    </div>
                    <div className="truncate text-sm font-bold" style={{ color: "var(--ed-ink)" }}>
                      {i.title}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-base font-extrabold" style={{ color: "var(--ed-ink)" }}>
                      {formatCurrency(i.priceCents, i.currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(i.programId)}
                      aria-label="Remove"
                      className="rounded-lg p-2 transition-colors hover:bg-[var(--ed-bg)]"
                      style={{ color: "var(--ed-rose)" }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <aside
              className="h-fit rounded-2xl border bg-white p-6"
              style={{ borderColor: "var(--ed-line)" }}
            >
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--ed-mute)" }}>Subtotal</span>
                <span className="font-bold" style={{ color: "var(--ed-ink)" }}>
                  {formatCurrency(subtotal, currency)}
                </span>
              </div>
              {mixed && (
                <p className="mt-2 text-[11px]" style={{ color: "var(--ed-rose)" }}>
                  Items use different currencies — checkout processes per
                  institute.
                </p>
              )}
              <Link
                href="/checkout"
                className="mt-5 flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white"
                style={{ background: "var(--ed-gradient)" }}
              >
                Proceed to checkout <ArrowRight className="size-4" />
              </Link>
              <p className="mt-3 text-center text-[11px]" style={{ color: "var(--ed-mute)" }}>
                You&apos;ll sign in if you haven&apos;t already.
              </p>
            </aside>
          </div>
        )}
      </main>
      <EuroFooter />
    </div>
  );
}
