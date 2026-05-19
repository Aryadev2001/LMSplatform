"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Saved courses ("Wishlist"). localStorage-only by design — same pattern
 * as the guest cart; no schema change, genuinely working end-to-end.
 */
export interface WishItem {
  programId: string;
  slug: string | null;
  title: string;
  instituteName: string;
  instituteSlug: string;
  priceCents: number;
  currency: string;
}

const KEY = "ed-wishlist-v1";

function read(): WishItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WishItem[]) : [];
  } catch {
    return [];
  }
}

function emit() {
  window.dispatchEvent(new Event("ed-wishlist-changed"));
}

export function useWishlist() {
  const [items, setItems] = useState<WishItem[]>([]);

  useEffect(() => {
    setItems(read());
    const sync = () => setItems(read());
    window.addEventListener("ed-wishlist-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("ed-wishlist-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const has = useCallback(
    (programId: string) => items.some((i) => i.programId === programId),
    [items],
  );

  const toggle = useCallback((item: WishItem) => {
    const cur = read();
    const exists = cur.some((i) => i.programId === item.programId);
    const next = exists
      ? cur.filter((i) => i.programId !== item.programId)
      : [...cur, item];
    localStorage.setItem(KEY, JSON.stringify(next));
    emit();
    return !exists;
  }, []);

  const remove = useCallback((programId: string) => {
    localStorage.setItem(
      KEY,
      JSON.stringify(read().filter((i) => i.programId !== programId)),
    );
    emit();
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(KEY);
    emit();
  }, []);

  return { items, has, toggle, remove, clear, count: items.length };
}
