import { ShieldCheck, Globe, Award, Users, Sparkles, HeartHandshake } from "lucide-react";
import {
  MarketingShell,
  MarketingHero,
  Section,
} from "@/components/euro/marketing";
import { Reveal } from "@/components/euro/marketing-client";

export const metadata = { title: "About — eurodigital.coach" };

const VALUES = [
  { icon: ShieldCheck, t: "Verified by default", d: "Every institute is vetted before a single course goes live." },
  { icon: Award, t: "Outcomes, not hours", d: "Verifiable certificates and real skills, recognised by employers." },
  { icon: Globe, t: "Global, local payouts", d: "Institutes collect on their own gateway; learners pay in their currency." },
  { icon: HeartHandshake, t: "Aligned incentives", d: "We earn only when an institute earns — zero upfront cost to teach." },
];

const STATS = [
  { v: "Free", l: "to start teaching" },
  { v: "0%", l: "upfront platform fee" },
  { v: "24/7", l: "AI add-on services" },
  { v: "Global", l: "learner reach" },
];

export default function AboutPage() {
  return (
    <MarketingShell>
      <MarketingHero
        eyebrow="About"
        title={
          <>
            A learning marketplace where{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--ed-gradient)" }}
            >
              institutes and learners
            </span>{" "}
            both win.
          </>
        }
        sub="eurodigital.coach connects verified institutes to learners worldwide — courses, recognised certificates, and rewards as you grow."
        primary={{ label: "Explore courses", href: "/explore" }}
        secondary={{ label: "Teach with us", href: "/for-institutes" }}
      />

      <Section eyebrow="Why we exist" title="Education that's fair on both sides">
        <Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            {VALUES.map((v) => (
              <div
                key={v.t}
                className="rounded-2xl border bg-white p-6"
                style={{ borderColor: "var(--ed-line)" }}
              >
                <span
                  className="flex size-10 items-center justify-center rounded-xl"
                  style={{ background: "var(--ed-bg)" }}
                >
                  <v.icon className="size-5" style={{ color: "var(--ed-blue)" }} />
                </span>
                <h3
                  className="mt-4 text-base font-bold"
                  style={{ color: "var(--ed-ink)" }}
                >
                  {v.t}
                </h3>
                <p className="mt-1 text-sm" style={{ color: "var(--ed-mute)" }}>
                  {v.d}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </Section>

      <Section className="!pt-0">
        <Reveal>
          <div
            className="grid grid-cols-2 gap-6 rounded-2xl p-8 md:grid-cols-4"
            style={{ background: "var(--ed-ink)" }}
          >
            {STATS.map((s) => (
              <div key={s.l} className="text-center">
                <div
                  className="text-3xl font-extrabold"
                  style={{ color: "var(--ed-green)" }}
                >
                  {s.v}
                </div>
                <div className="mt-1 text-[11px] font-bold uppercase tracking-widest text-white/45">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </Section>

      <Section className="!pt-0">
        <Reveal>
          <div
            className="flex flex-col items-center gap-4 rounded-2xl border bg-white px-6 py-12 text-center"
            style={{ borderColor: "var(--ed-line)" }}
          >
            <Sparkles className="size-8" style={{ color: "var(--ed-blue)" }} />
            <h2
              className="font-display text-2xl font-extrabold"
              style={{ color: "var(--ed-ink)" }}
            >
              Ready to learn or teach?
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href="/explore"
                className="rounded-xl px-6 py-3 text-sm font-bold text-white"
                style={{ background: "var(--ed-gradient)" }}
              >
                Browse courses
              </a>
              <a
                href="/partner/onboard"
                className="rounded-xl border px-6 py-3 text-sm font-bold"
                style={{ borderColor: "var(--ed-line)", color: "var(--ed-ink)" }}
              >
                Become a partner
              </a>
            </div>
          </div>
        </Reveal>
      </Section>
    </MarketingShell>
  );
}
