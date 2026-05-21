"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  getOrSyncCart,
  serverAddItem,
  serverRemoveItem,
  serverClearCart,
} from "@/app/cart/cart-actions";

/**
 * Cart hook with a stable API (`items / add / remove / clear / count`),
 * built on `useSyncExternalStore` so the cross-component subscription
 * lives in React's recommended primitive (no setState-in-effect smell).
 *
 * Guests: localStorage only (offline-first, instant).
 * Authed:  localStorage is the instant client cache; the DB cart is the
 *          source of truth. On first mount the guest cart is merged into
 *          the server cart (login-merge), then server items overwrite the
 *          local cache and every mutation is reconciled from the server's
 *          authoritative response (price/title never trusted from the
 *          client).
 */
export interface CartItem {
  programId: string;
  slug: string | null;
  title: string;
  priceCents: number;
  currency: string;
  instituteSlug: string;
  instituteName: string;
}

const KEY = "ed-cart-v1";
const EMPTY: CartItem[] = [];

// Module-scoped so every useCart() consumer agrees + sync runs once/page.
let authedMode = false;
let syncStarted = false;

// Snapshot cache keyed by the raw localStorage string for referential
// stability (useSyncExternalStore requires getSnapshot to return the same
// ref when the data hasn't changed — otherwise infinite re-renders).
let cachedRaw: string | null = null;
let cachedItems: CartItem[] = EMPTY;

function read(): CartItem[] {
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
    cachedItems = raw ? (JSON.parse(raw) as CartItem[]) : EMPTY;
  } catch {
    cachedItems = EMPTY;
  }
  return cachedItems;
}

function writeAll(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  emit();
}

function emit() {
  window.dispatchEvent(new Event("ed-cart-changed"));
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("ed-cart-changed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("ed-cart-changed", cb);
    window.removeEventListener("storage", cb);
  };
}

function getServerSnapshot(): CartItem[] {
  return EMPTY;
}

export function useCart() {
  const items = useSyncExternalStore(subscribe, read, getServerSnapshot);

  // First mounted hook drives the one-time server sync / login-merge.
  useEffect(() => {
    if (syncStarted) return;
    syncStarted = true;
    const localIds = read().map((i) => i.programId);
    getOrSyncCart(localIds)
      .then((res) => {
        if (res.authed) {
          authedMode = true;
          writeAll(res.items);
        }
      })
      .catch(() => {
        /* offline / transient — keep the local cache as-is */
      });
  }, []);

  const add = useCallback((item: CartItem) => {
    const cur = read();
    if (cur.some((i) => i.programId === item.programId)) return false;
    writeAll([...cur, item]);
    if (authedMode) {
      serverAddItem(item.programId)
        .then((res) => res.authed && writeAll(res.items))
        .catch(() => {});
    }
    return true;
  }, []);

  const remove = useCallback((programId: string) => {
    writeAll(read().filter((i) => i.programId !== programId));
    if (authedMode) {
      serverRemoveItem(programId)
        .then((res) => res.authed && writeAll(res.items))
        .catch(() => {});
    }
  }, []);

  const clear = useCallback(() => {
    if (typeof window !== "undefined") localStorage.removeItem(KEY);
    emit();
    if (authedMode) serverClearCart().catch(() => {});
  }, []);

  return { items, add, remove, clear, count: items.length };
}

// Re-exported so existing `import { taxRateFor } from "@/lib/cart"` callers
// keep working; the single source of truth is the framework-free module.
export { taxRateFor } from "@/lib/tax";
