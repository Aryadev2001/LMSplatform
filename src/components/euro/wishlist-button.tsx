"use client";

import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useWishlist, type WishItem } from "@/lib/wishlist";

export function WishlistButton({ item }: { item: WishItem }) {
  const { has, toggle } = useWishlist();
  const saved = has(item.programId);

  return (
    <button
      type="button"
      onClick={() => {
        const added = toggle(item);
        toast.success(
          added ? `Saved to wishlist` : `Removed from wishlist`,
        );
      }}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors hover:bg-[var(--ed-bg)]"
      style={{
        borderColor: saved ? "var(--ed-rose)" : "var(--ed-line)",
        color: saved ? "var(--ed-rose)" : "var(--ed-ink-2)",
      }}
      aria-pressed={saved}
    >
      <Heart
        className="size-4"
        fill={saved ? "var(--ed-rose)" : "none"}
      />
      {saved ? "Saved to wishlist" : "Save to wishlist"}
    </button>
  );
}
