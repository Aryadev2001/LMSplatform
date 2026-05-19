"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getOrSyncCart,
  serverAddItem,
  serverRemoveItem,
  serverClearCart,
} from "@/app/cart/cart-actions";

/**
 * Cart hook with a stable API (`items / add / remove / clear / count`).
 *
 * Guests: localStorage only (offline-first, instant).
 * Authed:  localStorage is the instant client cache; the DB cart
 *          (carts/cart_items) is the source of truth. On first mount the
 *          guest cart is merged into the server cart (login-merge), then
 *          server items overwrite the local cache and every mutation is
 *          mirrored to the server and reconciled from its authoritative
 *          response (server re-derives price/title — client is never
 *          trusted for money).
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

// Module-scoped so all useCart() instances agree and sync runs once/page.
let authedMode = false;
let syncStarted = false;

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  emit();
}

function emit() {
  window.dispatchEvent(new Event("ed-cart-changed"));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(read());
    const sync = () => setItems(read());
    window.addEventListener("ed-cart-changed", sync);
    window.addEventListener("storage", sync);

    // First mounted hook drives the one-time server sync / login-merge.
    if (!syncStarted) {
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
    }

    return () => {
      window.removeEventListener("ed-cart-changed", sync);
      window.removeEventListener("storage", sync);
    };
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
    localStorage.removeItem(KEY);
    emit();
    if (authedMode) {
      serverClearCart().catch(() => {});
    }
  }, []);

  return { items, add, remove, clear, count: items.length };
}

// Re-exported so existing `import { taxRateFor } from "@/lib/cart"` callers
// keep working; the single source of truth is the framework-free module.
export { taxRateFor } from "@/lib/tax";
