import Link from "next/link";
import { BookOpen, Building2, Gift, Award, Quote } from "lucide-react";
import { EuroLogo } from "./euro-logo";

const VALUE_PROPS = [
  { icon: BookOpen, title: "25,000+ courses", sub: "6 categories" },
  { icon: Building2, title: "1,200+ institutes", sub: "IIT, INSEAD, Allen…" },
  { icon: Gift, title: "Earn rewards", sub: "Points & referral commissions" },
  { icon: Award, title: "Verifiable certificates", sub: "Blockchain-backed" },
];

/**
 * Screen 8 split-screen auth shell. Left = value/branding panel, right =
 * Login/Sign-Up tabs + (children: role selector / Clerk component).
 */
export function AuthSplit({
  tab,
  children,
}: {
  tab: "login" | "signup";
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--ed-bg)" }}>
      {/* Left — value panel */}
      <div
        className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 text-white lg:flex"
        style={{ background: "var(--ed-ink)" }}
      >
        <div className="absolute inset-0 opacity-40" style={{ background: "var(--ed-halftone)" }} />
        <div className="relative">
          <Link href="/" className="inline-block rounded-lg bg-white px-3 py-2">
            <EuroLogo />
          </Link>
          <span
            className="mt-10 inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest"
            style={{ background: "var(--ed-green-dark)" }}
          >
            Join 480,000+ learners
          </span>
          <h1 className="mt-5 text-balance text-4xl font-extrabold leading-[1.1] tracking-tight">
            One account.
            <br />
            Every course.
            <br />
            Every institute.
          </h1>
          <p className="mt-4 max-w-sm text-sm" style={{ color: "var(--ed-mute)" }}>
            From entrance exams to corporate certifications — connect to the
            world&apos;s most trusted institutes.
          </p>

          <div className="mt-9 grid max-w-md grid-cols-2 gap-5">
            {VALUE_PROPS.map((v) => (
              <div key={v.title} className="flex items-start gap-3">
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <v.icon className="size-4" style={{ color: "var(--ed-blue)" }} />
                </div>
                <div>
                  <div className="text-sm font-bold">{v.title}</div>
                  <div className="text-xs" style={{ color: "var(--ed-mute)" }}>
                    {v.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative max-w-md">
          <Quote className="size-7" style={{ color: "var(--ed-blue)" }} />
          <p className="mt-3 text-sm leading-relaxed">
            “I went from zero to AWS-certified in 8 weeks, earned reward points,
            and landed a cloud role. The marketplace made it effortless.”
          </p>
          <p className="mt-2 text-xs font-semibold" style={{ color: "var(--ed-mute)" }}>
            — Arjun R., Solutions Architect
          </p>
        </div>
      </div>

      {/* Right — form panel */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 inline-block lg:hidden">
            <EuroLogo />
          </Link>

          {/* Tabs */}
          <div
            className="mb-7 flex rounded-xl border p-1"
            style={{ borderColor: "var(--ed-line)", background: "white" }}
          >
            <Link
              href="/sign-in"
              className="flex-1 rounded-lg py-2 text-center text-sm font-bold transition-colors"
              style={
                tab === "login"
                  ? { background: "var(--ed-ink)", color: "white" }
                  : { color: "var(--ed-mute)" }
              }
            >
              Login
            </Link>
            <Link
              href="/sign-up"
              className="flex-1 rounded-lg py-2 text-center text-sm font-bold transition-colors"
              style={
                tab === "signup"
                  ? { background: "var(--ed-ink)", color: "white" }
                  : { color: "var(--ed-mute)" }
              }
            >
              Sign Up
            </Link>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
