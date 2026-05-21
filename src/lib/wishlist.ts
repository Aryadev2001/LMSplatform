"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Saved courses ("Wishlist"). localStorage-only by design — same pattern
 * as the guest cart, on `useSyncExternalStore` for React-correct external
 * subscription (no setState-in-effect smell).
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
const EMPTY: WishItem[] = [];

// Stable snapshot cache (see cart.ts for why this matters).
let cachedRaw: string | null = null;
let cachedItems: WishItem[] = EMPTY;

function read(): WishItem[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    /* private mode / disabled storage */
  }
  if (raw === cachedRaw) return cachedItems;
  cachedRaw = raw;
  try {
    cachedItems = raw ? (JSON.parse(raw) as WishItem[]) : EMPTY;
  } catch {
    cachedItems = EMPTY;
  }
  return cachedItems;
}

function emit() {
  window.dispatchEvent(new Event("ed-wishlist-changed"));
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("ed-wishlist-changed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("ed-wishlist-changed", cb);
    window.removeEventListener("storage", cb);
  };
}

function getServerSnapshot(): WishItem[] {
  return EMPTY;
}

export function useWishlist() {
  const items = useSyncExternalStore(subscribe, read, getServerSnapshot);

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
    if (typeof window !== "undefined") localStorage.removeItem(KEY);
    emit();
  }, []);

  return { items, has, toggle, remove, clear, count: items.length };
}
