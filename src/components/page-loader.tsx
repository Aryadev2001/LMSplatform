"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { PencilLoader } from "@/components/ui/loader-1";

/**
 * Global page preloader — shows ONLY on a full/initial page load (first paint,
 * hard refresh, or direct URL), then fades out once the page is INTERACTIVE. It
 * does NOT fire on client-side route changes: the root layout persists across
 * those, so this component mounts once per real document load.
 *
 * The overlay is server-rendered (covers the page from first paint) and this
 * effect runs only after React hydration — i.e. once the page is interactive —
 * so we just hold it for a short minimum then fade. We deliberately do NOT wait
 * for `window load`: on content-heavy pages (images, embedded video) that took
 * ~4s and felt broken. Hiding at interactive keeps it a snappy ~1s.
 */
const MIN_VISIBLE_MS = 600;
const FADE_MS = 450;

export function PageLoader() {
  const [show, setShow] = useState(true);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    // This effect runs post-hydration → the page is interactive. Hold the
    // overlay for a short branded minimum, then fade out.
    let unmountTimer: ReturnType<typeof setTimeout> | undefined;
    const hideTimer = setTimeout(() => {
      setHiding(true);
      unmountTimer = setTimeout(() => setShow(false), FADE_MS);
    }, MIN_VISIBLE_MS);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(unmountTimer);
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
