import { LAYERS, type LayerId, type Firmographics, type RevenueBand } from "./questions";

export type Answers = Record<string, number>; // questionId -> 1..5

export type Stage = "foundation" | "growth" | "scale";

export interface LayerScore {
  layerId: LayerId;
  title: string;
  blurb: string;
  score: number; // 0-100 normalized
}

export interface DiagnosticResult {
  layerScores: LayerScore[];
  businessHealthScore: number; // 0-100
  stage: Stage;
  topBottlenecks: LayerScore[]; // 3 weakest
  recommendedCourseSlug: "business-x-ray" | "business-acceleration-engine" | "ceo-command-centre";
  recommendationReason: string;
}

/** Normalize a layer's raw 1-5 answers to 0-100. */
function normalizeLayer(answers: Answers, layerId: LayerId): number {
  const layer = LAYERS.find((l) => l.id === layerId)!;
  const qs = layer.questions;
  const raw = qs.reduce((sum, q) => sum + (answers[q.id] ?? 1), 0);
  const min = qs.length * 1;
  const max = qs.length * 5;
  return Math.round(((raw - min) / (max - min)) * 100);
}

export function scoreDiagnostic(
  answers: Answers,
  firmographics: Pick<Firmographics, "revenueBand">,
): DiagnosticResult {
  const layerScores: LayerScore[] = LAYERS.map((l) => ({
    layerId: l.id,
    title: l.title,
    blurb: l.blurb,
    score: normalizeLayer(answers, l.id),
  }));

  const businessHealthScore = Math.round(
    layerScores.reduce((s, l) => s + l.score, 0) / layerScores.length,
  );

  const stage: Stage =
    businessHealthScore <= 40 ? "foundation" : businessHealthScore <= 70 ? "growth" : "scale";

  const topBottlenecks = [...layerScores].sort((a, b) => a.score - b.score).slice(0, 3);

  const { slug, reason } = recommend(businessHealthScore, layerScores, firmographics.revenueBand);

  return {
    layerScores,
    businessHealthScore,
    stage,
    topBottlenecks,
    recommendedCourseSlug: slug,
    recommendationReason: reason,
  };
}

const HIGH_REVENUE: RevenueBand[] = ["50l_2cr", "2cr_5cr", "5cr_plus"];
const MID_REVENUE: RevenueBand[] = ["10l_50l", "50l_2cr", "2cr_5cr", "5cr_plus"];

function recommend(
  bhs: number,
  layerScores: LayerScore[],
  revenue: RevenueBand,
): { slug: DiagnosticResult["recommendedCourseSlug"]; reason: string } {
  // Override: anyone under ₹10L always starts at the Low Ticket regardless of BHS.
  if (revenue === "lt_10l") {
    return {
      slug: "business-x-ray",
      reason:
        "Below ₹10L revenue — start with the Business X-Ray to get clarity before scaling investment.",
    };
  }

  // Override: ₹50L+ and BHS ≥ 50 → push the High Ticket application.
  if (HIGH_REVENUE.includes(revenue) && bhs >= 50) {
    return {
      slug: "ceo-command-centre",
      reason:
        "Strong revenue and a solid health score — you qualify for the CEO Command Centre transformation.",
    };
  }

  // Override: ₹10L+ and BHS 41-70 → push the Mid Ticket.
  if (MID_REVENUE.includes(revenue) && bhs >= 41 && bhs <= 70) {
    return {
      slug: "business-acceleration-engine",
      reason:
        "Growth-stage business with revenue traction — the Acceleration Engine installs the systems you're missing.",
    };
  }

  // Base mapping by stage.
  if (bhs <= 40) {
    return {
      slug: "business-x-ray",
      reason: "Foundation stage — get clarity on the right problem to solve first.",
    };
  }
  if (bhs <= 70) {
    return {
      slug: "business-acceleration-engine",
      reason: "Growth stage — time to install repeatable systems.",
    };
  }
  return {
    slug: "ceo-command-centre",
    reason: "Scale stage — ready for a full transformation program.",
  };
}

export const STAGE_META: Record<Stage, { label: string; tone: string; blurb: string }> = {
  foundation: {
    label: "Foundation",
    tone: "var(--brand-warning, #F59E0B)",
    blurb: "Core building blocks need clarity before scaling.",
  },
  growth: {
    label: "Growth",
    tone: "var(--brand-blue, #1AADE0)",
    blurb: "Traction is there — systems are the next unlock.",
  },
  scale: {
    label: "Scale",
    tone: "var(--brand-green, #8CC63F)",
    blurb: "Strong fundamentals — ready to transform and scale.",
  },
};
