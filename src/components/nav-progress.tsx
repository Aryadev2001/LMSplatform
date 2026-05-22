"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin gradient progress bar at the top of the viewport. Fires the moment
 * any link is clicked (or a form submitted) and finishes when the new
 * pathname / searchParams pair has rendered. This is a perception fix —
 * it doesn't make the server any faster, but it tells the user "your
 * click landed" within ~50ms instead of leaving them staring at a frozen
 * old page until SSR completes.
 *
 * No third-party deps (NProgress would pull in jQuery-era globals); just
 * one element + a single effect.
 */
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState<number | null>(null);
  // Mount-time pathname/search snapshot so the *first* render doesn't
  // light up the bar — we only animate on subsequent navigations.
  const [last, setLast] = useState<{ p: string; s: string }>({
    p: pathname,
    s: searchParams?.toString() ?? "",
  });

  useEffect(() => {
    function start() {
      setProgress(0);
      // Two stage push: jump to 30% immediately (snappy feel), then crawl
      // up to 80% so we don't hit 100% before the server actually finishes.
      requestAnimationFrame(() => setProgress(30));
      const t1 = window.setTimeout(() => setProgress(80), 250);
      return () => window.clearTimeout(t1);
    }

    function bind(el: HTMLElement) {
      // Same-origin link?
      if (el.tagName === "A") {
        const a = el as HTMLAnchorElement;
        if (
          a.href &&
          a.host === window.location.host &&
          !a.target &&
          !a.hasAttribute("download") &&
          a.getAttribute("target") !== "_blank"
        ) {
          return start();
        }
      }
      // Form submit?
      if (el.tagName === "FORM") {
        return start();
      }
      return undefined;
    }

    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      let node = e.target as HTMLElement | null;
      while (node && node !== document.body) {
        if (node.tagName === "A" || node.tagName === "BUTTON") {
          // For buttons, check if they're inside a form.
          if (node.tagName === "A") {
            bind(node);
          }
          break;
        }
        node = node.parentElement;
      }
    }
    function onSubmit(e: Event) {
      const f = e.target as HTMLElement;
      if (f) bind(f);
    }

    window.addEventListener("click", onClick, true);
    window.addEventListener("submit", onSubmit, true);
    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  // When the route actually settles, finish the bar.
  useEffect(() => {
    const sp = searchParams?.toString() ?? "";
    if (pathname === last.p && sp === last.s) return;
    setLast({ p: pathname, s: sp });
    setProgress(100);
    const t = window.setTimeout(() => setProgress(null), 250);
    return () => window.clearTimeout(t);
  }, [pathname, searchParams, last.p, last.s]);

  if (progress === null) return null;

  return (
    <div
      role="progressbar"
      aria-label="Navigating"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
      style={{
        // Width transition is what the user actually sees animate.
        transform: `scaleX(${progress / 100})`,
        transformOrigin: "left center",
        transition:
          progress === 0
            ? "none"
            : progress === 100
              ? "transform 220ms ease-out, opacity 200ms ease-out"
              : "transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
        opacity: progress === 100 ? 0 : 1,
        background:
          "linear-gradient(90deg, #8CC63F 0%, #1AADE0 50%, #8CC63F 100%)",
        boxShadow: "0 0 8px rgba(26,173,224,0.4)",
      }}
    />
  );
}
