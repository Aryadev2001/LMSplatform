"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PencilLoader } from "@/components/ui/loader-1";

/**
 * Global page preloader. Renders a full-screen pencil loader on the very first
 * load and briefly on every route change, then fades out once the page is
 * ready. Kept smooth + self-healing:
 *  - minimum visible time so it never flashes,
 *  - initial load waits for `window load` (assets) with a safety cap so it can
 *    never get stuck,
 *  - route changes hide after the minimum time (the new view is already
 *    rendered by the time the pathname updates).
 *
 * Uses `usePathname` only (not `useSearchParams`), so it needs no Suspense
 * boundary and won't opt routes into client-side bailout.
 */
const MIN_VISIBLE_MS = 650;
const FADE_MS = 450;
const SAFETY_MS = 4000;

export function PageLoader() {
  const pathname = usePathname();
  const [show, setShow] = useState(true);
  const [hiding, setHiding] = useState(false);
  const firstRun = useRef(true);

  useEffect(() => {
    // Show on first mount and on every pathname change.
    setHiding(false);
    setShow(true);
    const startedAt = Date.now();
    const isFirst = firstRun.current;
    firstRun.current = false;

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

    if (isFirst && typeof document !== "undefined" && document.readyState !== "complete") {
      // Initial full load — wait for assets, with a safety cap so we never hang.
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
  }, [pathname]);

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
