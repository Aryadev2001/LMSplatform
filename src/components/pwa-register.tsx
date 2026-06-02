"use client";

import { useEffect } from "react";

/** Registers the service worker so the app is installable (Add to Home
 *  Screen) and the shell works offline. No-ops where SW is unsupported. */
export function PWARegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const onLoad = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
  }, []);
  return null;
}
