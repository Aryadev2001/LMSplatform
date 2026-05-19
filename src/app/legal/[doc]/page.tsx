import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import {
  MarketingShell,
  MarketingHero,
  Section,
  Prose,
} from "@/components/euro/marketing";

export const dynamic = "force-dynamic";

const DOCS: Record<
  string,
  { title: string; eyebrow: string; intro: string; sections: { h: string; p: string }[] }
> = {
  terms: {
    title: "Terms of Service",
    eyebrow: "Legal",
    intro:
      "These terms govern use of the eurodigital.coach marketplace by learners and institutes.",
    sections: [
      { h: "1. The service", p: "eurodigital.coach is a marketplace connecting verified institutes with learners. Institutes own their course content; the platform provides hosting, checkout and certification." },
      { h: "2. Accounts", p: "You are responsible for activity under your account. Institute admins must keep their payment and contact details accurate." },
      { h: "3. Payments & payouts", p: "Paid courses are charged through the institute's own connected gateway. The platform deducts a per-sale commission; free courses incur no fee." },
      { h: "4. Acceptable use", p: "No unlawful, infringing or misleading content. The platform may remove content or suspend accounts that violate these terms." },
      { h: "5. Liability", p: "The service is provided “as is”. To the extent permitted by law, the platform is not liable for indirect or consequential losses." },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    eyebrow: "Legal",
    intro:
      "How we collect, use and protect personal data across the marketplace.",
    sections: [
      { h: "1. Data we collect", p: "Account details (name, email), enrolment and progress data, and payment metadata. Gateway secrets are encrypted at rest and never displayed." },
      { h: "2. How we use it", p: "To operate the marketplace: provisioning access, issuing certificates, processing orders, and platform analytics." },
      { h: "3. Sharing", p: "Institute admins see their own learners' enrolment data. Payment processing is handled by the institute's chosen gateway under their terms." },
      { h: "4. Your rights", p: "You may request access to or deletion of your personal data, subject to record-keeping obligations." },
      { h: "5. Security", p: "Row-level tenant isolation, encrypted secrets, and audited privileged actions." },
    ],
  },
  refund: {
    title: "Refund Policy",
    eyebrow: "Legal",
    intro:
      "Refund handling for course purchases on the marketplace.",
    sections: [
      { h: "1. Who issues refunds", p: "Because payments settle into the institute's own gateway, refunds are issued by the institute that sold the course." },
      { h: "2. Eligibility", p: "Each institute may set its own refund window and conditions, shown on the course before purchase where applicable." },
      { h: "3. Reward points", p: "Points redeemed on a refunded order are returned to the learner's balance where the order is fully reversed." },
      { h: "4. Free courses", p: "Free courses involve no payment and therefore no refund." },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    eyebrow: "Legal",
    intro: "How cookies and similar technologies are used.",
    sections: [
      { h: "1. Essential cookies", p: "Required for authentication and to keep you signed in. The marketplace will not function correctly without them." },
      { h: "2. Functional", p: "Remember preferences such as your cart and wishlist (stored in your browser)." },
      { h: "3. Analytics", p: "Aggregate, non-identifying usage to improve the product." },
      { h: "4. Managing cookies", p: "You can control cookies in your browser settings; disabling essential cookies may break sign-in." },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(DOCS).map((doc) => ({ doc }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ doc: string }>;
}) {
  const { doc } = await params;
  const d = DOCS[doc];
  return { title: d ? `${d.title} — eurodigital.coach` : "Legal" };
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ doc: string }>;
}) {
  const { doc } = await params;
  const d = DOCS[doc];
  if (!d) notFound();

  return (
    <MarketingShell>
      <MarketingHero eyebrow={d.eyebrow} title={d.title} sub={d.intro} />

      <Section>
        <div
          className="mx-auto mb-8 flex max-w-3xl items-start gap-3 rounded-xl border px-4 py-3 text-[13px]"
          style={{
            borderColor: "var(--ed-warn)",
            background: "rgba(245,158,11,0.08)",
            color: "var(--ed-ink-2)",
          }}
        >
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0"
            style={{ color: "var(--ed-warn)" }}
          />
          <span>
            This is a starting template, not legal advice. Replace it with text
            reviewed by your counsel before going live.
          </span>
        </div>
        <Prose>
          {d.sections.map((s) => (
            <div key={s.h}>
              <h3
                className="text-base font-bold"
                style={{ color: "var(--ed-ink)" }}
              >
                {s.h}
              </h3>
              <p className="mt-1" style={{ color: "var(--ed-mute)" }}>
                {s.p}
              </p>
            </div>
          ))}
          <p className="pt-2 text-[12px]" style={{ color: "var(--ed-mute)" }}>
            Last updated: template — set your effective date on publish.
          </p>
        </Prose>
      </Section>
    </MarketingShell>
  );
}
