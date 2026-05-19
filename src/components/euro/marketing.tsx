import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { EuroNav } from "./euro-nav";
import { EuroFooter } from "./euro-footer";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--ed-bg)" }}>
      <EuroNav />
      <main>{children}</main>
      <EuroFooter />
    </div>
  );
}

export function MarketingHero({
  eyebrow,
  title,
  sub,
  primary,
  secondary,
}: {
  eyebrow: string;
  title: ReactNode;
  sub: string;
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
}) {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "var(--ed-ink)" }}
    >
      <span
        aria-hidden
        className="ed-aura pointer-events-none absolute -left-40 -top-40 size-[34rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(0,174,239,0.32) 0%, transparent 70%)",
        }}
      />
      <span
        aria-hidden
        className="ed-aura ed-aura-b pointer-events-none absolute -bottom-44 -right-32 size-[36rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(141,198,63,0.28) 0%, transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-4xl px-6 py-20 text-center md:py-28">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.22em]"
          style={{ color: "var(--ed-blue)" }}
        >
          {eyebrow}
        </p>
        <h1 className="font-display mx-auto mt-4 max-w-3xl text-balance text-4xl font-extrabold leading-[1.12] tracking-tight text-white md:text-5xl">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-balance text-base leading-relaxed text-white/60 md:text-lg">
          {sub}
        </p>
        {(primary || secondary) && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {primary && (
              <Link
                href={primary.href}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--ed-gradient)" }}
              >
                {primary.label} <ArrowRight className="size-4" />
              </Link>
            )}
            {secondary && (
              <Link
                href={secondary.href}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.2)" }}
              >
                {secondary.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export function Section({
  eyebrow,
  title,
  children,
  className,
}: {
  eyebrow?: string;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mx-auto max-w-6xl px-6 py-16 ${className ?? ""}`}>
      {eyebrow && (
        <p
          className="text-[11px] font-bold uppercase tracking-[0.2em]"
          style={{ color: "var(--ed-blue)" }}
        >
          {eyebrow}
        </p>
      )}
      {title && (
        <h2
          className="font-display mt-2 text-2xl font-extrabold tracking-tight md:text-3xl"
          style={{ color: "var(--ed-ink)" }}
        >
          {title}
        </h2>
      )}
      <div className={title || eyebrow ? "mt-8" : ""}>{children}</div>
    </section>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div
      className="mx-auto max-w-3xl space-y-4 text-sm leading-relaxed"
      style={{ color: "var(--ed-ink-2)" }}
    >
      {children}
    </div>
  );
}
