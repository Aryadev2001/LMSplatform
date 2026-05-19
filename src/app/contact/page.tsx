import { Mail, Building2, LifeBuoy, ArrowRight } from "lucide-react";
import {
  MarketingShell,
  MarketingHero,
  Section,
} from "@/components/euro/marketing";
import { Reveal } from "@/components/euro/marketing-client";

export const metadata = { title: "Contact — eurodigital.coach" };

const CHANNELS = [
  {
    icon: Mail,
    t: "General & support",
    d: "Questions about courses, certificates or your account.",
    action: "hello@eurodigital.coach",
    href: "mailto:hello@eurodigital.coach",
  },
  {
    icon: Building2,
    t: "Become a partner",
    d: "Run your institute on eurodigital.coach — free to start.",
    action: "Start onboarding",
    href: "/partner/onboard",
  },
  {
    icon: LifeBuoy,
    t: "Help center",
    d: "Answers to the most common questions, instantly.",
    action: "Browse FAQs",
    href: "/help",
  },
];

export default function ContactPage() {
  return (
    <MarketingShell>
      <MarketingHero
        eyebrow="Contact"
        title="We'd love to hear from you"
        sub="Pick the channel that fits — we keep replies fast and human."
      />

      <Section>
        <Reveal>
          <div className="grid gap-4 sm:grid-cols-3">
            {CHANNELS.map((c) => (
              <a
                key={c.t}
                href={c.href}
                className="group flex flex-col rounded-2xl border bg-white p-6 transition-shadow hover:shadow-md"
                style={{ borderColor: "var(--ed-line)" }}
              >
                <span
                  className="flex size-10 items-center justify-center rounded-xl"
                  style={{ background: "var(--ed-bg)" }}
                >
                  <c.icon className="size-5" style={{ color: "var(--ed-blue)" }} />
                </span>
                <h3
                  className="mt-4 text-base font-bold"
                  style={{ color: "var(--ed-ink)" }}
                >
                  {c.t}
                </h3>
                <p
                  className="mt-1 flex-1 text-sm"
                  style={{ color: "var(--ed-mute)" }}
                >
                  {c.d}
                </p>
                <span
                  className="mt-4 inline-flex items-center gap-1 text-sm font-bold"
                  style={{ color: "var(--ed-blue)" }}
                >
                  {c.action}
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </a>
            ))}
          </div>
          <p
            className="mt-8 text-center text-[12px]"
            style={{ color: "var(--ed-mute)" }}
          >
            Euro Digital Technologies L.L.C. · Abu Dhabi, UAE · UAE Free Zone
            Trade License.
          </p>
        </Reveal>
      </Section>
    </MarketingShell>
  );
}
