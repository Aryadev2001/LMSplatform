import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheck, BadgeCheck, Clock } from "lucide-react";
import { EuroLogo } from "./euro-logo";

const VALUE_PROPS = [
  {
    icon: ShieldCheck,
    title: "Verified institutes & instructors",
    body: "Every partner on the marketplace is vetted before they can publish.",
  },
  {
    icon: BadgeCheck,
    title: "Verifiable certificates",
    body: "Finish a course and earn a certificate with a public verification link.",
  },
  {
    icon: Clock,
    title: "Learn at your own pace",
    body: "Lifetime access — start, pause and resume any time, on any device.",
  },
];

const COPY = {
  login: {
    eyebrow: "Welcome back",
    headline: "Pick up exactly where you left off.",
    sub: "One login for learners and institutes — we route you to the right dashboard automatically.",
  },
  signup: {
    eyebrow: "Learning marketplace",
    headline: "Learn from verified institutes. Get certified.",
    sub: "Create your account in under a minute. No credit card needed to get started.",
  },
} as const;

export function AnimatedAuth({
  tab,
  children,
}: {
  tab: "login" | "signup";
  children: ReactNode;
}) {
  const copy = COPY[tab === "login" ? "login" : "signup"];

  return (
    <section
      className="flex min-h-[100dvh]"
      style={{ background: "var(--ed-bg)" }}
    >
      {/* ── Left: brand showcase ───────────────────────────────── */}
      <aside
        className="relative hidden w-[54%] flex-col justify-between overflow-hidden px-14 py-12 lg:flex xl:px-16"
        style={{ background: "var(--ed-ink)" }}
      >
        {/* Ambient brand glow — layered, slow, no clutter */}
        <span
          aria-hidden
          className="ed-aura pointer-events-none absolute -left-40 -top-40 size-[34rem] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(0,174,239,0.45) 0%, transparent 70%)",
          }}
        />
        <span
          aria-hidden
          className="ed-aura ed-aura-b pointer-events-none absolute -bottom-48 -right-32 size-[36rem] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(141,198,63,0.38) 0%, transparent 70%)",
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            maskImage:
              "radial-gradient(ellipse at 30% 20%, black 0%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at 30% 20%, black 0%, transparent 75%)",
          }}
        />

        {/* Top — wordmark */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center">
            <EuroLogo onDark className="text-2xl" />
          </Link>
        </div>

        {/* Middle — editorial pitch */}
        <div className="relative z-10 max-w-md">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.22em]"
            style={{ color: "var(--ed-blue)" }}
          >
            {copy.eyebrow}
          </p>
          <h1
            className="font-display mt-4 text-balance text-4xl leading-[1.12] tracking-tight text-white xl:text-[2.7rem]"
          >
            {copy.headline}
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/60">
            {copy.sub}
          </p>

          <ul className="mt-10 space-y-5">
            {VALUE_PROPS.map((v) => (
              <li key={v.title} className="flex gap-3.5">
                <span
                  className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  <v.icon
                    className="size-4"
                    style={{ color: "var(--ed-green)" }}
                  />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white/90">
                    {v.title}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-white/45">
                    {v.body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom — trust line */}
        <div className="relative z-10">
          <div
            className="h-px w-full"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <p className="mt-5 text-[13px] text-white/40">
            Secure passwordless sign-in — we email you a one-time link. No
            password to remember or leak.
          </p>
        </div>
      </aside>

      {/* ── Right: auth ────────────────────────────────────────── */}
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-10 lg:w-[46%] lg:px-14">
        <div className="mx-auto w-full max-w-[420px]">
          {/* Mobile wordmark (left panel is desktop-only) */}
          <Link href="/" className="mb-9 inline-block lg:hidden">
            <EuroLogo className="text-2xl" />
          </Link>

          {/* Segmented control */}
          <div
            className="mb-8 flex rounded-full p-1"
            style={{
              background: "var(--ed-bg)",
              border: "1px solid var(--ed-line)",
            }}
          >
            <Link
              href="/sign-in"
              className="flex-1 rounded-full py-2 text-center text-sm font-bold transition-all"
              style={
                tab === "login"
                  ? {
                      background: "white",
                      color: "var(--ed-ink)",
                      boxShadow: "0 1px 2px rgba(14,30,43,0.10)",
                    }
                  : { color: "var(--ed-mute)" }
              }
            >
              Log in
            </Link>
            <Link
              href="/sign-up"
              className="flex-1 rounded-full py-2 text-center text-sm font-bold transition-all"
              style={
                tab === "signup"
                  ? {
                      background: "white",
                      color: "var(--ed-ink)",
                      boxShadow: "0 1px 2px rgba(14,30,43,0.10)",
                    }
                  : { color: "var(--ed-mute)" }
              }
            >
              Sign up
            </Link>
          </div>

          {children}

          <p
            className="mt-8 text-center text-[12px] leading-relaxed"
            style={{ color: "var(--ed-mute)" }}
          >
            By continuing you agree to our{" "}
            <Link href="/" className="font-semibold underline underline-offset-2">
              Terms
            </Link>{" "}
            &{" "}
            <Link href="/" className="font-semibold underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
