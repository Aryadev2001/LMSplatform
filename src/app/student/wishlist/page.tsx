"use client";

import Link from "next/link";
import { Heart, Trash2, ShoppingCart, Check } from "lucide-react";
import { toast } from "sonner";
import { useWishlist } from "@/lib/wishlist";
import { useCart } from "@/lib/cart";
import { formatCurrency } from "@/lib/format";

export default function WishlistPage() {
  const { items, remove } = useWishlist();
  const { add, items: cart } = useCart();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1
          className="font-display text-2xl font-extrabold tracking-tight"
          style={{ color: "var(--ed-ink)" }}
        >
          Wishlist
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ed-mute)" }}>
          {items.length} saved course{items.length === 1 ? "" : "s"}
        </p>
      </div>

      {items.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center"
          style={{ borderColor: "var(--ed-line)", color: "var(--ed-mute)" }}
        >
          <Heart className="size-9" />
          <p className="text-sm">No saved courses yet.</p>
          <Link
            href="/explore"
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-white"
            style={{ background: "var(--ed-gradient)" }}
          >
            Explore courses
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((w) => {
            const inCart = cart.some((c) => c.programId === w.programId);
            return (
              <div
                key={w.programId}
                className="flex items-center justify-between gap-4 rounded-2xl border bg-white p-4"
                style={{ borderColor: "var(--ed-line)" }}
              >
                <div className="min-w-0">
                  <div
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--ed-blue)" }}
                  >
                    {w.instituteName}
                  </div>
                  <Link
                    href={w.slug ? `/courses/${w.slug}` : "/explore"}
                    className="truncate text-sm font-bold hover:underline"
                    style={{ color: "var(--ed-ink)" }}
                  >
                    {w.title}
                  </Link>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className="text-sm font-extrabold"
                    style={{ color: "var(--ed-ink)" }}
                  >
                    {formatCurrency(w.priceCents, w.currency)}
                  </span>
                  {inCart ? (
                    <Link
                      href="/cart"
                      className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold"
                      style={{
                        borderColor: "var(--ed-line)",
                        color: "var(--ed-ink-2)",
                      }}
                    >
                      <Check
                        className="size-3.5"
                        style={{ color: "var(--ed-green-dark)" }}
                      />
                      In cart
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        add({
                          programId: w.programId,
                          slug: w.slug,
                          title: w.title,
                          priceCents: w.priceCents,
                          currency: w.currency,
                          instituteSlug: w.instituteSlug,
                          instituteName: w.instituteName,
                        });
                        toast.success(`${w.title} added to cart`);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white"
                      style={{ background: "var(--ed-gradient)" }}
                    >
                      <ShoppingCart className="size-3.5" /> Add to cart
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(w.programId)}
                    aria-label="Remove"
                    className="rounded-lg p-2 transition-colors hover:bg-[var(--ed-bg)]"
                    style={{ color: "var(--ed-rose)" }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
