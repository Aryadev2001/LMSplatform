import { notFound } from "next/navigation";
import {
  MarketingShell,
  MarketingHero,
  Section,
  Prose,
} from "@/components/euro/marketing";

export const dynamic = "force-dynamic";

const ENTITY = "Euro Digital Technologies";
const CONTACT_EMAIL = "support@eurodigital.coach";
const EFFECTIVE_DATE = "2 June 2026";

const DOCS: Record<
  string,
  { title: string; eyebrow: string; intro: string; sections: { h: string; p: string }[] }
> = {
  terms: {
    title: "Terms of Service",
    eyebrow: "Legal",
    intro:
      "These terms govern your use of the eurodigital.coach marketplace, operated by " +
      `${ENTITY}, by learners and partner institutes.`,
    sections: [
      { h: "1. The service", p: `eurodigital.coach (operated by ${ENTITY}, "we", "us") is an online marketplace connecting verified institutes with learners. Institutes own their course content; we provide hosting, checkout, certification and the learning platform.` },
      { h: "2. Eligibility & accounts", p: "You must be at least 18 (or have guardian consent) to enrol. You are responsible for all activity under your account and for keeping your details accurate. Institute admins must keep their payment and contact details current." },
      { h: "3. Enrolment & access", p: "To enrol you complete your learner profile, then pay (where the course is paid) — access to the student dashboard is granted immediately on successful enrolment. Access duration is shown on each course (e.g. lifetime or a stated number of months)." },
      { h: "4. Payments, taxes & payouts", p: "Paid courses are charged through the selling institute's own connected payment gateway. Applicable taxes (GST) are added at checkout where required. We deduct a per-sale platform commission from paid orders; free courses incur no fee." },
      { h: "5. Content & intellectual property", p: "Course content is owned by the institute that publishes it. On enrolment you receive a personal, non-transferable, non-exclusive licence to access it for your own learning. You may not download, copy, resell, share or redistribute protected course material (including videos)." },
      { h: "6. Acceptable use", p: "No unlawful, infringing, misleading or harmful content or conduct. We may remove content or suspend accounts that violate these terms or applicable law." },
      { h: "7. Disclaimers & liability", p: "The service is provided “as is”. To the maximum extent permitted by law, our aggregate liability is limited to the amount you paid for the relevant order, and we are not liable for indirect or consequential losses." },
      { h: "8. Governing law & jurisdiction", p: "These terms are governed by the laws of India. Subject to applicable law, the courts at the seat of our registered office shall have jurisdiction over any dispute." },
      { h: "9. Changes", p: "We may update these terms; material changes will be reflected by the “last updated” date below. Continued use after changes constitutes acceptance." },
      { h: "10. Contact", p: `Questions about these terms: ${CONTACT_EMAIL}.` },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    eyebrow: "Legal",
    intro: "How we collect, use, share and protect personal data across the marketplace.",
    sections: [
      { h: "1. Who we are", p: `${ENTITY} operates eurodigital.coach and is responsible for personal data processed through the platform. Contact: ${CONTACT_EMAIL}.` },
      { h: "2. Data we collect", p: "Account details (name, email); learner profile you provide (mobile number, and any optional professional/financial details); enrolment, progress and certificate data; payment metadata (we never store full card details — those are handled by the payment gateway); and basic device/usage data." },
      { h: "3. How and why we use it", p: "To provide the service: create your account, run the enrolment + checkout flow, grant dashboard access, issue certificates, provide support, prevent fraud, and improve the product through aggregate analytics. We process data to perform our contract with you, to meet legal obligations, and with your consent where required." },
      { h: "4. Sharing", p: "The institute whose course you enrol in can see their own learners' enrolment data. Payments are processed by the institute's chosen gateway (e.g. Razorpay/Stripe) under their terms. We use service providers (hosting, email) bound to protect your data, and may disclose data where required by law." },
      { h: "5. Data retention", p: "We keep personal data while your account is active and as long as needed for the purposes above, then delete or anonymise it — except where longer retention is required by law (e.g. tax and accounting records)." },
      { h: "6. Your rights", p: "You may request access to, correction of, or deletion of your personal data, and may withdraw consent, subject to our legal record-keeping obligations. Email " + CONTACT_EMAIL + " to make a request." },
      { h: "7. Security", p: "We use row-level tenant isolation, encryption of secrets at rest, access controls, and auditing of privileged actions. No method of transmission or storage is 100% secure, but we work to protect your data." },
      { h: "8. Grievance Officer", p: `In accordance with India's Information Technology Act, 2000 and the rules thereunder, grievances regarding personal data or content may be addressed to our Grievance Officer at ${CONTACT_EMAIL}. We acknowledge complaints within 24 hours and aim to resolve them within the timelines prescribed by law.` },
      { h: "9. Contact", p: `Privacy questions or requests: ${CONTACT_EMAIL}.` },
    ],
  },
  refund: {
    title: "Cancellation & Refund Policy",
    eyebrow: "Legal",
    intro: "How cancellations and refunds are handled for course purchases on the marketplace.",
    sections: [
      { h: "1. Who issues refunds", p: "Because payments settle directly into the selling institute's own gateway, refunds are issued by the institute that sold the course. We facilitate the request but the institute is the merchant of record." },
      { h: "2. Eligibility & window", p: "Each institute may set its own refund window and conditions, shown on the course before purchase where applicable. As courses are digital and access is granted instantly, a refund may be reduced or declined once a significant portion of the content has been accessed." },
      { h: "3. How to request", p: `Request a cancellation/refund by contacting the institute, or email ${CONTACT_EMAIL} with your order reference and we'll route it to the institute.` },
      { h: "4. Processing time", p: "Once approved, refunds are returned to your original payment method, typically within 5–7 business days, depending on your bank or card issuer." },
      { h: "5. Reward points", p: "Reward points redeemed on an order are returned to your balance when the order is fully reversed." },
      { h: "6. Free courses", p: "Free courses involve no payment and therefore no refund." },
    ],
  },
  shipping: {
    title: "Shipping & Delivery Policy",
    eyebrow: "Legal",
    intro: "How course access is delivered. All products on eurodigital.coach are digital — there is no physical shipment.",
    sections: [
      { h: "1. Digital products only", p: "Every product sold on eurodigital.coach is a digital online course or subscription. Nothing is physically shipped, so no shipping address or shipping fee applies." },
      { h: "2. Delivery & timing", p: "Access is delivered electronically and granted immediately after a successful enrolment/payment. Your courses appear in your student dashboard, and a confirmation email with your receipt is sent to your registered email." },
      { h: "3. Accessing your course", p: "Sign in at eurodigital.coach and open your student dashboard to start learning on any device. Access duration (e.g. lifetime or a stated number of months) is shown on each course." },
      { h: "4. Delivery issues", p: `If you've completed payment but don't see your course within a few minutes, check your spam folder for the confirmation email, then contact ${CONTACT_EMAIL} with your order reference and we'll restore access promptly.` },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    eyebrow: "Legal",
    intro: "How cookies and similar technologies are used on the marketplace.",
    sections: [
      { h: "1. Essential cookies", p: "Required for authentication and to keep you signed in. The marketplace will not function correctly without them." },
      { h: "2. Functional", p: "Remember preferences such as your cart and wishlist (stored in your browser)." },
      { h: "3. Analytics", p: "Aggregate, non-identifying usage data to help us improve the product." },
      { h: "4. Managing cookies", p: "You can control cookies in your browser settings; disabling essential cookies may break sign-in." },
    ],
  },
  disclaimer: {
    title: "Learner Disclaimer",
    eyebrow: "Legal",
    intro:
      "Important: outcomes from any course on this marketplace depend on your effort and circumstances.",
    sections: [
      { h: "1. Results may vary", p: "Course content on eurodigital.coach is educational. We make no guarantee of specific career, certification, or income outcomes for any individual learner." },
      { h: "2. Certificates", p: "Course completion certificates are issued by the partner institute, not by eurodigital.coach. Whether a certificate is accredited or recognised externally is a matter for the issuing institute." },
      { h: "3. Third-party content", p: "Courses are authored by independent partner institutes. We vet each institute before publishing but do not warrant the accuracy or completeness of every lesson." },
      { h: "4. Health, legal, financial advice", p: "No course on this marketplace constitutes medical, legal, financial, or other professional advice. If a course covers those topics, consult a qualified professional before acting on its content." },
      { h: "5. Acknowledgement", p: "By checking the disclaimer box during signup you confirm you've read this notice." },
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
          <p
            className="mt-6 border-t pt-4 text-[12px]"
            style={{ borderColor: "var(--ed-line)", color: "var(--ed-mute)" }}
          >
            Last updated: {EFFECTIVE_DATE} · {ENTITY} · Questions?{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-semibold underline underline-offset-2"
              style={{ color: "var(--ed-blue)" }}
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </Prose>
      </Section>
    </MarketingShell>
  );
}
