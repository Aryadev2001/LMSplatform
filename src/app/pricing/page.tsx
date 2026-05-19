import { Check, Sparkles } from "lucide-react";
import {
  MarketingShell,
  MarketingHero,
  Section,
} from "@/components/euro/marketing";
import { Reveal } from "@/components/euro/marketing-client";

export const metadata = { title: "Pricing — eurodigital.coach" };

const INCLUDED = [
  "Auto-generated branded storefront",
  "Unlimited courses (free or paid)",
  "Your own Stripe / Razorpay — payouts go straight to you",
  "Verifiable certificates for learners",
  "Reward points & referral engine",
  "AI add-on services catalog",
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <MarketingHero
        eyebrow="Pricing"
        title={
          <>
            Free to start.{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--ed-gradient)" }}
            >
              We earn when you earn.
            </span>
          </>
        }
        sub="No upfront fee, no monthly subscription. Publish free courses at zero cost. On paid sales we take a small platform commission — that's it."
        primary={{ label: "Start teaching free", href: "/partner/onboard" }}
      />

      <Section>
        <Reveal>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* The single, honest plan */}
            <div
              className="flex flex-col rounded-2xl border bg-white p-8"
              style={{ borderColor: "var(--ed-blue)" }}
            >
              <span
                className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white"
                style={{ background: "var(--ed-gradient)" }}
              >
                Institute plan
              </span>
              <div className="mt-5 flex items-end gap-2">
                <span
                  className="text-5xl font-extrabold tracking-tight"
                  style={{ color: "var(--ed-ink)" }}
                >
                  ₹0
                </span>
                <span className="pb-1 text-sm" style={{ color: "var(--ed-mute)" }}>
                  / month — forever
                </span>
              </div>
              <p className="mt-2 text-sm" style={{ color: "var(--ed-mute)" }}>
                Then a platform commission on each <strong>paid</strong> sale
                (set per institute; standard 15%). Free courses are always 100%
                free to run.
              </p>
              <ul className="mt-6 space-y-2.5">
                {INCLUDED.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check
                      className="mt-0.5 size-4 shrink-0"
                      style={{ color: "var(--ed-green-dark)" }}
                    />
                    <span style={{ color: "var(--ed-ink-2)" }}>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/partner/onboard"
                className="mt-8 inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-bold text-white"
                style={{ background: "var(--ed-gradient)" }}
              >
                Create your institute
              </a>
            </div>

            {/* Worked example */}
            <div
              className="flex flex-col justify-center rounded-2xl border p-8"
              style={{ borderColor: "var(--ed-line)", background: "white" }}
            >
              <h3
                className="text-base font-bold"
                style={{ color: "var(--ed-ink)" }}
              >
                What a sale looks like
              </h3>
              <p className="mt-1 text-sm" style={{ color: "var(--ed-mute)" }}>
                Illustrative, at the standard 15% rate.
              </p>
              <div
                className="mt-5 space-y-3 rounded-xl p-5 text-sm"
                style={{ background: "var(--ed-bg)" }}
              >
                <Row k="Course price" v="₹1,000" />
                <Row k="Platform commission (15%)" v="− ₹150" muted />
                <div
                  className="my-1 border-t"
                  style={{ borderColor: "var(--ed-line)" }}
                />
                <Row k="You receive" v="₹850" strong />
                <Row k="Free course" v="₹0 — no commission" muted />
              </div>
              <p
                className="mt-4 flex items-center gap-2 text-[12px]"
                style={{ color: "var(--ed-mute)" }}
              >
                <Sparkles className="size-3.5" style={{ color: "var(--ed-blue)" }} />
                Payouts settle directly through your own connected gateway.
              </p>
            </div>
          </div>
        </Reveal>
      </Section>
    </MarketingShell>
  );
}

function Row({
  k,
  v,
  strong,
  muted,
}: {
  k: string;
  v: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: "var(--ed-mute)" }}>{k}</span>
      <span
        className={strong ? "font-extrabold" : "font-semibold"}
        style={{ color: muted ? "var(--ed-mute)" : "var(--ed-ink)" }}
      >
        {v}
      </span>
    </div>
  );
}
