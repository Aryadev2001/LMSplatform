"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Trash2, ShoppingCart, ArrowRight, Building2 } from "lucide-react";
import { toast } from "sonner";
import { EuroNav } from "@/components/euro/euro-nav";
import { EuroFooter } from "@/components/euro/euro-footer";
import { useCart } from "@/lib/cart";
import { formatCurrency } from "@/lib/format";
import { revalidateCart, type FreshCartItem } from "./actions";

interface Row {
  programId: string;
  slug: string | null;
  title: string;
  imageUrl: string | null;
  priceCents: number;
  currency: string;
  instituteName: string | null;
  instituteSlug: string | null;
  loading: boolean;
}

export default function CartPage() {
  const { items, remove } = useCart();

  // Fresh server data keyed by programId; null until the first revalidation
  // returns (stored data renders meanwhile, then upgrades in place).
  const [fresh, setFresh] = useState<Map<string, FreshCartItem> | null>(null);

  const idsKey = useMemo(
    () => items.map((i) => i.programId).sort().join(","),
    [items],
  );

  useEffect(() => {
    const ids = idsKey ? idsKey.split(",") : [];
    if (ids.length === 0) {
      setFresh(new Map());
      return;
    }
    let active = true;
    revalidateCart(ids)
      .then((res) => {
        if (!active) return;
        setFresh(new Map(res.map((r) => [r.programId, r])));
        const gone = ids.filter((id) => !res.some((r) => r.programId === id));
        if (gone.length) {
          gone.forEach((id) => remove(id));
          toast(
            `${gone.length} item${gone.length === 1 ? "" : "s"} no longer available — removed from your cart.`,
          );
        }
      })
      .catch(() => active && setFresh(new Map()));
    return () => {
      active = false;
    };
  }, [idsKey, remove]);

  const rows: Row[] = useMemo(() => {
    return items
      .map((i): Row | null => {
        if (fresh === null) return { ...i, imageUrl: null, loading: true };
        const f = fresh.get(i.programId);
        if (!f) return null; // unavailable → pruned
        return { ...f, loading: false };
      })
      .filter((x): x is Row => x !== null);
  }, [items, fresh]);

  const currency = rows[0]?.currency ?? "USD";
  const mixed = rows.some((i) => i.currency !== currency);
  const subtotal = rows.reduce((s, i) => s + i.priceCents, 0);

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
            ({rows.length} {rows.length === 1 ? "item" : "items"})
          </span>
        </h1>

        {rows.length === 0 ? (
          <div
            className="flex flex-col items-center gap-4 rounded-2xl border border-dashed bg-white py-20 text-center"
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
              {rows.map((i) => (
                <CartRow key={i.programId} i={i} onRemove={() => remove(i.programId)} />
              ))}
            </div>

            <aside
              className="h-fit rounded-2xl border bg-white p-6"
              style={{ borderColor: "var(--ed-line)" }}
            >
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--ed-mute)" }}>Subtotal</span>
                <span className="font-bold tabular-nums" style={{ color: "var(--ed-ink)" }}>
                  {subtotal === 0 ? "Free" : formatCurrency(subtotal, currency)}
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
                className="mt-5 flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--ed-gradient)" }}
              >
                Proceed to checkout <ArrowRight className="size-4" />
              </Link>
              <p className="mt-3 text-center text-[11px]" style={{ color: "var(--ed-mute)" }}>
                Live prices · you&apos;ll sign in if you haven&apos;t already.
              </p>
            </aside>
          </div>
        )}
      </main>
      <EuroFooter />
    </div>
  );
}

function CartRow({ i, onRemove }: { i: Row; onRemove: () => void }) {
  const courseHref = i.slug ? `/courses/${i.slug}` : "/explore";
  const initial = i.title.trim().charAt(0).toUpperCase() || "•";
  const isFree = i.priceCents === 0;

  return (
    <div
      className="flex items-center gap-4 rounded-2xl border bg-white p-3"
      style={{ borderColor: "var(--ed-line)" }}
    >
      {/* Thumbnail */}
      <Link
        href={courseHref}
        className="group relative size-16 shrink-0 overflow-hidden rounded-xl"
        style={{ background: "var(--ed-gradient)" }}
      >
        {i.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={i.imageUrl}
            alt={i.title}
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{ background: "var(--ed-halftone)" }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-2xl font-black text-white/90">
              {initial}
            </span>
          </>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        {i.instituteName && (
          <div
            className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--ed-blue)" }}
          >
            <Building2 className="size-3" /> {i.instituteName}
          </div>
        )}
        <Link
          href={courseHref}
          className="block truncate text-sm font-bold hover:underline"
          style={{ color: "var(--ed-ink)" }}
        >
          {i.title}
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <span
          className={`text-base font-extrabold tabular-nums ${i.loading ? "animate-pulse" : ""}`}
          style={{ color: isFree ? "var(--ed-green-dark)" : "var(--ed-ink)" }}
        >
          {isFree ? "Free" : formatCurrency(i.priceCents, i.currency)}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="rounded-lg p-2 transition-colors hover:bg-[var(--ed-bg)]"
          style={{ color: "var(--ed-rose)" }}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
