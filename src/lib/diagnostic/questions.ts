/**
 * Business X-Ray — the 7-Layer Business Scan question bank.
 * Each scored question is a 1-5 Likert ("Strongly disagree" → "Strongly agree").
 * Firmographic questions are not scored — used for segmentation + override rules.
 */

export type LayerId =
  | "business_model"
  | "revenue_streams"
  | "lead_generation"
  | "sales_process"
  | "team_delegation"
  | "time_execution"
  | "bottleneck";

export interface Layer {
  id: LayerId;
  index: number;
  title: string;
  blurb: string;
  questions: { id: string; text: string }[];
}

export const LAYERS: Layer[] = [
  {
    id: "business_model",
    index: 1,
    title: "Business Model Clarity",
    blurb: "Product-market fit, pricing, ideal-customer clarity",
    questions: [
      { id: "bm1", text: "I can describe my ideal customer in one sentence." },
      { id: "bm2", text: "My pricing reflects the value I deliver, not what competitors charge." },
      { id: "bm3", text: "I have fewer than 5 core offers and I know which is most profitable." },
    ],
  },
  {
    id: "revenue_streams",
    index: 2,
    title: "Revenue Streams",
    blurb: "Diversification, predictability, recurring revenue",
    questions: [
      { id: "rs1", text: "My business has more than one reliable source of revenue." },
      { id: "rs2", text: "If my top revenue channel disappeared tomorrow, I could survive 90 days." },
      { id: "rs3", text: "I have at least one recurring revenue stream (subscription, retainer, membership)." },
    ],
  },
  {
    id: "lead_generation",
    index: 3,
    title: "Lead Generation System",
    blurb: "Consistency, channel mix, owner-dependence",
    questions: [
      { id: "lg1", text: "I know how many leads I will get next month, within ±20%." },
      { id: "lg2", text: "My lead generation runs without my daily involvement." },
      { id: "lg3", text: "I have 3+ active lead channels (organic, paid, partnership)." },
    ],
  },
  {
    id: "sales_process",
    index: 4,
    title: "Sales Process",
    blurb: "Documented process, follow-up, conversion tracking",
    questions: [
      { id: "sp1", text: "I have a documented sales script and follow-up cadence." },
      { id: "sp2", text: "I track conversion rate from lead → call → close." },
      { id: "sp3", text: "Someone other than me can close a sale in my business." },
    ],
  },
  {
    id: "team_delegation",
    index: 5,
    title: "Team & Delegation",
    blurb: "Delegation level, owner-dependency, SOPs",
    questions: [
      { id: "td1", text: "If I took 2 weeks off, my business would run without me." },
      { id: "td2", text: "My team makes decisions without constant check-ins." },
      { id: "td3", text: "I have SOPs for every recurring task in my business." },
    ],
  },
  {
    id: "time_execution",
    index: 6,
    title: "Time & Execution Discipline",
    blurb: "Strategic vs. fire-fighting, priority alignment",
    questions: [
      { id: "te1", text: "My first 3 hours of the day are spent on revenue-generating work." },
      { id: "te2", text: "I end most days feeling I accomplished my top priority." },
      { id: "te3", text: "My calendar reflects my stated priorities." },
    ],
  },
  {
    id: "bottleneck",
    index: 7,
    title: "Bottleneck Identification",
    blurb: "Self-awareness of the #1 constraint",
    questions: [
      { id: "bn1", text: "If I could fix one thing in my business tomorrow, I know exactly what it is." },
      { id: "bn2", text: "I measure weekly KPIs that tell me what's working." },
      { id: "bn3", text: "I know the one number that most predicts my next 90 days of revenue." },
    ],
  },
];

export const LIKERT_OPTIONS = [
  { value: 1, label: "Strongly disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly agree" },
] as const;

// ---------- Firmographics (not scored) ----------
export const REVENUE_BANDS = [
  { value: "lt_10l", label: "Under ₹10L" },
  { value: "10l_50l", label: "₹10L – ₹50L" },
  { value: "50l_2cr", label: "₹50L – ₹2Cr" },
  { value: "2cr_5cr", label: "₹2Cr – ₹5Cr" },
  { value: "5cr_plus", label: "₹5Cr+" },
] as const;

export type RevenueBand = (typeof REVENUE_BANDS)[number]["value"];

export const BUSINESS_TYPES = [
  "Coach",
  "Consultant",
  "Agency",
  "Course creator",
  "Product",
  "Service",
  "Other",
] as const;

export const TEAM_SIZES = ["Solo", "2–5", "6–15", "16–50", "50+"] as const;

export interface Firmographics {
  fullName: string;
  email: string;
  phone: string;
  revenueBand: RevenueBand;
  businessType: string;
  teamSize: string;
  yearsInBusiness: string;
}

export const ALL_QUESTION_IDS = LAYERS.flatMap((l) => l.questions.map((q) => q.id));
export const TOTAL_SCORED_QUESTIONS = ALL_QUESTION_IDS.length;
