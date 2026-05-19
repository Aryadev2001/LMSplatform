"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";

/** Fade + rise in when scrolled into view. Reduced-motion is handled by the
 *  global CSS rule that neutralises transitions. */
export function Reveal({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(14px)",
        transition: `opacity .6s ease ${delay}ms, transform .6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {items.map((f) => (
        <details
          key={f.q}
          className="group rounded-2xl border bg-white px-5 py-4"
          style={{ borderColor: "var(--ed-line)" }}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold">
            <span style={{ color: "var(--ed-ink)" }}>{f.q}</span>
            <Plus
              className="size-4 shrink-0 transition-transform group-open:rotate-45"
              style={{ color: "var(--ed-mute)" }}
            />
          </summary>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--ed-mute)" }}>
            {f.a}
          </p>
        </details>
      ))}
    </div>
  );
}
