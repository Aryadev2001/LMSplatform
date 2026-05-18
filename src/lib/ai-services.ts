/**
 * AI Services catalog — the europic.ai module.
 *
 * Phase 1 (master prompt §10.3, §17): 8 PLACEHOLDER services, manual.
 * Live europic.ai sync + admin override (`/admin/ai-services`) is Phase 2 —
 * this static catalog is the documented stand-in until then.
 */

export type AiCategory =
  | "Career"
  | "Learning"
  | "Productivity"
  | "Developer";

export type AiPeriod = "one_time" | "monthly" | "yearly";

export interface AiService {
  id: string;
  slug: string;
  name: string;
  category: AiCategory;
  icon: string; // emoji
  description: string;
  priceCents: number; // USD minor units
  oldPriceCents?: number;
  period: AiPeriod;
  rewardPoints: number; // student earns on purchase
  partnerRewardPoints: number; // partners earn 2× (§10.7)
  badge?: "NEW" | "BESTSELLER" | "POPULAR" | string; // e.g. "38% OFF"
  resellable: boolean;
}

export const AI_SERVICES: AiService[] = [
  {
    id: "svc-resume",
    slug: "ai-resume-linkedin-optimizer",
    name: "AI Resume & LinkedIn Optimizer",
    category: "Career",
    icon: "📄",
    description:
      "Rewrite your resume and LinkedIn for any role — ATS-optimized, recruiter-ready in minutes.",
    priceCents: 4900,
    oldPriceCents: 7900,
    period: "one_time",
    rewardPoints: 150,
    partnerRewardPoints: 300,
    badge: "38% OFF",
    resellable: true,
  },
  {
    id: "svc-study-buddy",
    slug: "ai-study-buddy-tutor",
    name: "AI Study Buddy — 24/7 Tutor",
    category: "Learning",
    icon: "🎓",
    description:
      "A personal tutor that explains any concept, quizzes you, and tracks weak areas — round the clock.",
    priceCents: 1900,
    period: "monthly",
    rewardPoints: 80,
    partnerRewardPoints: 160,
    badge: "BESTSELLER",
    resellable: true,
  },
  {
    id: "svc-mock-interview",
    slug: "ai-mock-interview-coach",
    name: "AI Mock Interview Coach",
    category: "Career",
    icon: "🎤",
    description:
      "Realistic mock interviews with instant feedback on answers, tone, and confidence.",
    priceCents: 7900,
    period: "one_time",
    rewardPoints: 220,
    partnerRewardPoints: 440,
    resellable: true,
  },
  {
    id: "svc-content-writer",
    slug: "ai-content-blog-writer",
    name: "AI Content & Blog Writer",
    category: "Productivity",
    icon: "✍️",
    description:
      "Generate SEO-ready blogs, captions, and marketing copy in your brand voice.",
    priceCents: 2900,
    period: "monthly",
    rewardPoints: 100,
    partnerRewardPoints: 200,
    resellable: true,
  },
  {
    id: "svc-code-debugger",
    slug: "ai-code-review-debugger",
    name: "AI Code Review & Debugger",
    category: "Developer",
    icon: "🛠️",
    description:
      "Paste code, get instant reviews, bug fixes, and explanations across 20+ languages.",
    priceCents: 3900,
    period: "monthly",
    rewardPoints: 130,
    partnerRewardPoints: 260,
    badge: "NEW",
    resellable: true,
  },
  {
    id: "svc-voice-doc",
    slug: "ai-voice-note-to-document",
    name: "AI Voice Note → Document",
    category: "Productivity",
    icon: "🎙️",
    description:
      "Turn voice notes and meetings into clean, structured documents and summaries.",
    priceCents: 2400,
    period: "monthly",
    rewardPoints: 90,
    partnerRewardPoints: 180,
    resellable: true,
  },
  {
    id: "svc-presentation",
    slug: "ai-presentation-designer",
    name: "AI Presentation Designer",
    category: "Productivity",
    icon: "📊",
    description:
      "Describe your topic — get a polished, on-brand slide deck in seconds.",
    priceCents: 3500,
    period: "monthly",
    rewardPoints: 120,
    partnerRewardPoints: 240,
    resellable: true,
  },
  {
    id: "svc-roadmap",
    slug: "ai-career-roadmap-builder",
    name: "AI Career Roadmap Builder",
    category: "Career",
    icon: "🧭",
    description:
      "A step-by-step skill + certification roadmap tailored to your target role.",
    priceCents: 5900,
    period: "one_time",
    rewardPoints: 180,
    partnerRewardPoints: 360,
    badge: "POPULAR",
    resellable: true,
  },
];

export const AI_CATEGORIES: ("All" | AiCategory)[] = [
  "All",
  "Career",
  "Learning",
  "Productivity",
  "Developer",
];

export function formatAiPrice(s: AiService): string {
  const dollars = (s.priceCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  });
  if (s.period === "monthly") return `${dollars}/mo`;
  if (s.period === "yearly") return `${dollars}/yr`;
  return dollars;
}

/** Partner "operations" price — 30% margin off student retail (§10.5). */
export function partnerPriceCents(s: AiService): number {
  return Math.round(s.priceCents * 0.7);
}

export function formatAiPartnerPrice(s: AiService): string {
  const dollars = (partnerPriceCents(s) / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  });
  if (s.period === "monthly") return `${dollars}/mo`;
  if (s.period === "yearly") return `${dollars}/yr`;
  return dollars;
}

export function formatAiOldPrice(s: AiService): string | null {
  if (!s.oldPriceCents) return null;
  return (s.oldPriceCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  });
}
