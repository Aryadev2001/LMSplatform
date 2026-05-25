import {
  MarketingShell,
  MarketingHero,
  Section,
} from "@/components/euro/marketing";
import { Reveal, FaqList } from "@/components/euro/marketing-client";

export const metadata = { title: "Help center — eurodigital.coach" };

const LEARNERS = [
  {
    q: "How do I enroll in a course?",
    a: "Open any course, add it to your cart and check out. Paid courses use the institute's payment gateway; free courses enroll you instantly with no payment.",
  },
  {
    q: "Can I pay with reward points?",
    a: "Yes. At checkout you can redeem reward points (1 point = ₹1) up to the institute's allowed limit; the rest is paid normally.",
  },
  {
    q: "Do I get a certificate?",
    a: "Complete every lesson of a course to unlock a verifiable certificate with a public verification link.",
  },
  {
    q: "Where are my courses?",
    a: "Your student dashboard lists every course you've enrolled in, with live progress, plus Completed, Wishlist and Points.",
  },
];

const INSTITUTES = [
  {
    q: "What does it cost to teach?",
    a: "Nothing upfront. You publish free or paid courses; we take a platform commission only on paid sales. Free courses cost you nothing.",
  },
  {
    q: "How do I upload a free course?",
    a: "Institute dashboard → Programs → New program → set Price to 0 → Save → Publish. Students can then enroll with zero payment.",
  },
  {
    q: "How do payouts work?",
    a: "You connect your own Stripe or Razorpay in Settings → Payment gateway. Learner payments settle directly into your account.",
  },
  {
    q: "Can the platform push courses to me?",
    a: "Yes — super-admin can push master courses into your catalog as drafts; you set the price and publish them.",
  },
];

export default function HelpPage() {
  return (
    <MarketingShell>
      <MarketingHero
        eyebrow="Help center"
        title="Answers, fast"
        sub="The most common questions from learners and institutes. Still stuck? Reach us from the Contact page."
        secondary={{ label: "Contact us", href: "/contact" }}
      />

      <Section eyebrow="For learners" title="Using your account">
        <Reveal>
          <FaqList items={LEARNERS} />
        </Reveal>
      </Section>

      <Section eyebrow="For institutes" title="Running your institute" className="!pt-0">
        <Reveal>
          <FaqList items={INSTITUTES} />
        </Reveal>
      </Section>
    </MarketingShell>
  );
}
