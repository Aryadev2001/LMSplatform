"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { PencilLoader } from "@/components/ui/loader-1";

/**
 * Global page preloader — shows ONLY on a full/initial page load (first paint,
 * hard refresh, or direct URL), then fades out once the page is ready. It does
 * NOT fire on client-side route changes: the root layout persists across those,
 * so this component mounts once per real document load and never re-shows on
 * in-app navigation.
 *
 * Self-healing: the initial load waits for `window load` (assets) with a safety
 * cap so it can never hang, plus a minimum visible time so it never flashes.
 */
const MIN_VISIBLE_MS = 650;
const FADE_MS = 450;
const SAFETY_MS = 4000;

export function PageLoader() {
  const [show, setShow] = useState(true);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    const startedAt = Date.now();
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let unmountTimer: ReturnType<typeof setTimeout> | undefined;
    let safetyTimer: ReturnType<typeof setTimeout> | undefined;
    let onLoad: (() => void) | null = null;

    const beginHide = () => {
      const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt));
      hideTimer = setTimeout(() => {
        setHiding(true); // start the opacity fade
        unmountTimer = setTimeout(() => setShow(false), FADE_MS);
      }, wait);
    };

    if (typeof document !== "undefined" && document.readyState !== "complete") {
      // Wait for assets to finish, with a safety cap so we never hang.
      onLoad = () => beginHide();
      window.addEventListener("load", onLoad, { once: true });
      safetyTimer = setTimeout(beginHide, SAFETY_MS);
    } else {
      beginHide();
    }

    return () => {
      if (hideTimer) clearTimeout(hideTimer);
      if (unmountTimer) clearTimeout(unmountTimer);
      if (safetyTimer) clearTimeout(safetyTimer);
      if (onLoad) window.removeEventListener("load", onLoad);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={cn("page-loader-overlay", hiding && "page-loader-overlay--hide")}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <PencilLoader />
    </div>
  );
}
