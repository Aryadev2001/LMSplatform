"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Client-side cart (localStorage). There is no carts/cart_items schema yet
 * (master spec §6.4 is a Phase-2 migration) — the cart lives in the browser
 * until checkout, where a server action turns it into enrollments + payments.
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

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
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
    return () => {
      window.removeEventListener("ed-cart-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const add = useCallback((item: CartItem) => {
    const cur = read();
    if (cur.some((i) => i.programId === item.programId)) return false;
    localStorage.setItem(KEY, JSON.stringify([...cur, item]));
    emit();
    return true;
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

  return { items, add, remove, clear, count: items.length };
}

/** Tax rule by billing country (master prompt §8.5). */
export function taxRateFor(country: string): { rate: number; label: string } {
  const c = country.trim().toLowerCase();
  if (["ae", "uae", "united arab emirates"].includes(c))
    return { rate: 0.05, label: "VAT 5%" };
  if (["in", "india"].includes(c)) return { rate: 0.18, label: "GST 18%" };
  return { rate: 0, label: "Tax" };
}
