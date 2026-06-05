"use client";

import Link from "next/link";
import {
  Heart,
  Trash2,
  ShoppingCart,
  Check,
  Building2,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { useWishlist, type WishItem } from "@/lib/wishlist";
import { useCart } from "@/lib/cart";
import { formatCurrency } from "@/lib/format";

export default function WishlistPage() {
  const { items, remove } = useWishlist();
  const { add, items: cart } = useCart();

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--ed-rose)" }}>
            Saved for later
          </div>
          <h1
            className="mt-1 font-display text-3xl font-extrabold tracking-tight"
            style={{ color: "var(--ed-ink)" }}
          >
            Wishlist
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ed-mute)" }}>
            {items.length} saved course{items.length === 1 ? "" : "s"} — ready when you are.
          </p>
        </div>
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--ed-gradient)" }}
        >
          <GraduationCap className="size-4" /> Browse more courses
        </Link>
      </div>

      {items.length === 0 ? (
        <div
          className="flex flex-col items-center gap-4 rounded-3xl border border-dashed bg-white py-20 text-center"
          style={{ borderColor: "var(--ed-line)" }}
        >
          <span
            className="flex size-16 items-center justify-center rounded-2xl"
            style={{ background: "rgba(244,63,94,0.10)", color: "var(--ed-rose)" }}
          >
            <Heart className="size-8" />
          </span>
          <div>
            <p className="text-base font-bold" style={{ color: "var(--ed-ink)" }}>
              No saved courses yet
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--ed-mute)" }}>
              Tap the heart on any course to save it here for later.
            </p>
          </div>
          <Link
            href="/explore"
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--ed-gradient)" }}
          >
            Explore courses
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((w) => (
            <WishlistCard
              key={w.programId}
              w={w}
              inCart={cart.some((c) => c.programId === w.programId)}
              onAdd={() => {
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
              onRemove={() => remove(w.programId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WishlistCard({
  w,
  inCart,
  onAdd,
  onRemove,
}: {
  w: WishItem;
  inCart: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const courseHref = w.slug ? `/courses/${w.slug}` : "/explore";
  const initial = w.title.trim().charAt(0).toUpperCase() || "•";
  const isFree = w.priceCents === 0;

  return (
    <div
      className="group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
      style={{ borderColor: "var(--ed-line)" }}
    >
      {/* Cover (links to the public course page) */}
      <Link
        href={courseHref}
        className="relative block h-36 overflow-hidden"
        style={{ background: "var(--ed-gradient)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{ background: "var(--ed-halftone)" }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-6xl font-black text-white/90">
          {initial}
        </span>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />

        {w.instituteName && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground backdrop-blur">
            <Building2 className="size-3" /> {w.instituteName}
          </span>
        )}

        <span
          className="absolute right-3 top-3 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold tabular-nums backdrop-blur"
          style={
            isFree
              ? { background: "var(--ed-green-dark)", color: "white" }
              : { background: "rgba(255,255,255,0.92)", color: "var(--ed-ink)" }
          }
        >
          {isFree ? "Free" : formatCurrency(w.priceCents, w.currency)}
        </span>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <Link
          href={courseHref}
          className="line-clamp-2 text-base font-extrabold leading-snug hover:underline"
          style={{ color: "var(--ed-ink)" }}
        >
          {w.title}
        </Link>

        <div className="mt-auto flex items-center gap-2 pt-5">
          {inCart ? (
            <Link
              href="/cart"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-bold"
              style={{ borderColor: "var(--ed-line)", color: "var(--ed-ink-2)" }}
            >
              <Check className="size-3.5" style={{ color: "var(--ed-green-dark)" }} /> In cart — view
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--ed-gradient)" }}
            >
              <ShoppingCart className="size-3.5" /> {isFree ? "Enroll" : "Add to cart"}
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove from wishlist"
            className="shrink-0 rounded-xl border p-2.5 transition-colors hover:bg-[var(--ed-bg)]"
            style={{ borderColor: "var(--ed-line)", color: "var(--ed-rose)" }}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
