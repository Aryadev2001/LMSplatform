"use client";

import Link from "next/link";
import { ShoppingCart, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCart, type CartItem } from "@/lib/cart";

export function CartIndicator() {
  const { count } = useCart();
  return (
    <Link
      href="/cart"
      className="relative rounded-xl p-2 transition-colors hover:bg-[var(--ed-bg)]"
      aria-label="Cart"
      style={{ color: "var(--ed-ink)" }}
    >
      <ShoppingCart className="size-5" />
      {count > 0 && (
        <span
          className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ background: "var(--ed-rose)" }}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

export function AddToCartButton({
  item,
  className,
}: {
  item: CartItem;
  className?: string;
}) {
  const { add, items } = useCart();
  const inCart = items.some((i) => i.programId === item.programId);

  if (inCart) {
    return (
      <Link
        href="/cart"
        className={
          className ??
          "flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold"
        }
        style={{ borderColor: "var(--ed-line)", color: "var(--ed-ink-2)" }}
      >
        <Check className="size-4" style={{ color: "var(--ed-green-dark)" }} />
        In cart — view
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (add(item)) toast.success(`${item.title} added to cart`);
      }}
      className={
        className ??
        "flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors hover:bg-[var(--ed-bg)]"
      }
      style={{ borderColor: "var(--ed-line)", color: "var(--ed-ink)" }}
    >
      <Plus className="size-4" />
      Add to cart
    </button>
  );
}
