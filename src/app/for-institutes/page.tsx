import {
  Building2,
  Palette,
  Upload,
  CreditCard,
  Rocket,
  BarChart3,
} from "lucide-react";
import {
  MarketingShell,
  MarketingHero,
  Section,
} from "@/components/euro/marketing";
import { Reveal } from "@/components/euro/marketing-client";

export const metadata = { title: "For institutes — eurodigital.coach" };

const STEPS = [
  { icon: Building2, t: "Create your institute", d: "Name + subdomain. You're live on a branded storefront in minutes." },
  { icon: Palette, t: "Brand it", d: "Your logo and colours — the storefront is auto-generated for you." },
  { icon: Upload, t: "Upload courses", d: "Free or paid. Modules, lessons, video — publish when ready." },
  { icon: CreditCard, t: "Connect payouts", d: "Your own Stripe or Razorpay. Money lands directly in your account." },
  { icon: Rocket, t: "Go live", d: "Students discover, enroll, learn, and earn verifiable certificates." },
  { icon: BarChart3, t: "Grow", d: "Reward points, referrals and AI add-ons drive repeat learners." },
];

export default function ForInstitutesPage() {
  return (
    <MarketingShell>
      <MarketingHero
        eyebrow="For institutes"
        title={
          <>
            Teach the world.{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--ed-gradient)" }}
            >
              Keep your brand.
            </span>{" "}
            Keep your money.
          </>
        }
        sub="Launch a branded learning storefront with zero upfront cost. Sell paid courses on your own payment gateway, or offer free ones — your call."
        primary={{ label: "Create your institute", href: "/contact" }}
        secondary={{ label: "See pricing", href: "/pricing" }}
      />

      <Section eyebrow="How it works" title="Live in about 20 minutes">
        <Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <div
                key={s.t}
                className="rounded-2xl border bg-white p-6"
                style={{ borderColor: "var(--ed-line)" }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="flex size-10 items-center justify-center rounded-xl"
                    style={{ background: "var(--ed-bg)" }}
                  >
                    <s.icon
                      className="size-5"
                      style={{ color: "var(--ed-blue)" }}
                    />
                  </span>
                  <span
                    className="text-2xl font-extrabold"
                    style={{ color: "var(--ed-line)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3
                  className="mt-4 text-base font-bold"
                  style={{ color: "var(--ed-ink)" }}
                >
                  {s.t}
                </h3>
                <p className="mt-1 text-sm" style={{ color: "var(--ed-mute)" }}>
                  {s.d}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </Section>

      <Section className="!pt-0">
        <Reveal>
          <div
            className="relative overflow-hidden rounded-2xl px-6 py-14 text-center"
            style={{ background: "var(--ed-ink)" }}
          >
            <span
              aria-hidden
              className="ed-aura pointer-events-none absolute -right-24 -top-24 size-80 rounded-full blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(141,198,63,0.3) 0%, transparent 70%)",
              }}
            />
            <h2 className="relative font-display text-2xl font-extrabold text-white md:text-3xl">
              No upfront cost. Start free today.
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-sm text-white/55">
              You only pay a platform commission on paid sales. Free courses
              cost you nothing, ever.
            </p>
            <a
              href="/contact"
              className="relative mt-7 inline-flex items-center rounded-xl px-7 py-3 text-sm font-bold text-white"
              style={{ background: "var(--ed-gradient)" }}
            >
              Get started
            </a>
          </div>
        </Reveal>
      </Section>
    </MarketingShell>
  );
}
