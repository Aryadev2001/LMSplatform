"use client";

import { useEffect } from "react";

/**
 * Service-worker cleanup.
 *
 * We previously registered a caching service worker for offline/installability.
 * That SW cached `_next/static` chunks cache-first under a never-versioned
 * cache and kept responses regardless of status, which could strand a browser
 * on stale/broken assets after a deploy — the page rendered but never
 * hydrated, leaving every button dead.
 *
 * Until a correctly-versioned SW is reintroduced, this component registers
 * NOTHING. Instead it unregisters any service worker the visitor still has and
 * deletes its caches, then reloads the tab ONCE (guarded) so a poisoned tab
 * recovers a clean, network-loaded copy without a manual hard-refresh.
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const hadController = !!navigator.serviceWorker.controller;

    (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      } catch {
        /* ignore */
      }
      try {
        if (typeof caches !== "undefined") {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {
        /* ignore */
      }
      // If this tab was being controlled by the (now-removed) SW its assets may
      // be stale — reload once to pull everything fresh. The sessionStorage
      // guard makes this strictly one reload per tab, so it can never loop.
      try {
        if (hadController && !sessionStorage.getItem("sw-cleanup-reloaded")) {
          sessionStorage.setItem("sw-cleanup-reloaded", "1");
          window.location.reload();
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  return null;
}
