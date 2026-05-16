/**
 * Seed the 3 EDT courses + module/lesson structure (spec §6).
 * Run: npm run db:seed   (idempotent — upserts by slug)
 * Video URLs are placeholders until real content is supplied.
 */
import "dotenv/config";
import { db } from "../src/db/client";
import { programs, modules, lessons } from "../src/db/schema";
import { eq } from "drizzle-orm";

const PLACEHOLDER_VIDEO = "https://stream.placeholder.edt/lesson.m3u8";

type LessonSeed = { title: string; durationSeconds: number };
type ModuleSeed = { title: string; description?: string; lessons: LessonSeed[] };
type CourseSeed = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  priceCents: number; // INR paise
  durationMonths: number;
  tier: "low" | "mid" | "high";
  type: "one_time" | "subscription";
  badgeColor: string;
  requiresApplication: boolean;
  modules: ModuleSeed[];
};

const m = (n: number) => n * 60; // minutes → seconds

const COURSES: CourseSeed[] = [
  {
    slug: "business-x-ray",
    name: "Business X-Ray™",
    tagline: "The 3-Day Business Diagnosis Sprint",
    description:
      "A 3-day self-paced sprint that turns your Business X-Ray score into a clear, prioritised 60-day roadmap. Find the one problem worth solving first.",
    priceCents: 9900,
    durationMonths: 1,
    tier: "low",
    type: "one_time",
    badgeColor: "#8CC63F",
    requiresApplication: false,
    modules: [
      {
        title: "Day 1 — The Business MRI",
        lessons: [
          { title: "Why 93% of Owners Are Solving the Wrong Problem", durationSeconds: m(12) },
          { title: "The 7-Layer Business Scan Framework", durationSeconds: m(15) },
          { title: "How to Read Your Diagnosis Results — Scoring Matrix", durationSeconds: m(8) },
        ],
      },
      {
        title: "Day 2 — The Priority Decoder",
        lessons: [
          { title: "The Leverage Hierarchy — Which Problem to Solve First", durationSeconds: m(15) },
          { title: "The 5 Business Stages Model", durationSeconds: m(12) },
          { title: "Common Patterns & Costly Mistakes at Each Stage", durationSeconds: m(10) },
        ],
      },
      {
        title: "Day 3 — The 60-Day Roadmap",
        lessons: [
          { title: "Building Your Personalised 60-Day Roadmap", durationSeconds: m(18) },
          { title: "The Accountability Architecture", durationSeconds: m(10) },
          { title: "What Comes Next — Accelerate 10x Faster", durationSeconds: m(8) },
        ],
      },
    ],
  },
  {
    slug: "business-acceleration-engine",
    name: "Business Acceleration Engine™",
    tagline: "60-Day Done-With-You Systems Installation",
    description:
      "A 60-day program that installs the lead-gen, sales, delivery and team systems your business is missing — 28 videos + 8 weekly live sessions.",
    priceCents: 999900,
    durationMonths: 2,
    tier: "mid",
    type: "one_time",
    badgeColor: "#1AADE0",
    requiresApplication: false,
    modules: [
      {
        title: "Weeks 1–2 · Foundation & Business Architecture",
        lessons: [
          { title: "The Business Blueprint Redesign — Part 1", durationSeconds: m(18) },
          { title: "The Business Blueprint Redesign — Part 2", durationSeconds: m(18) },
          { title: "Offer Stack Architecture", durationSeconds: m(18) },
          { title: "Pricing for Value", durationSeconds: m(18) },
          { title: "Live 1 — Business Model Hot Seat", durationSeconds: m(60) },
        ],
      },
      {
        title: "Weeks 3–4 · Lead Generation & Sales Machine",
        lessons: [
          { title: "The Lead Generation Machine — Channels", durationSeconds: m(18) },
          { title: "Content & Hook Engineering", durationSeconds: m(18) },
          { title: "The Sales Conversion System", durationSeconds: m(18) },
          { title: "Follow-up Cadence That Closes", durationSeconds: m(16) },
          { title: "Live 3 — Sales Role-Play + Script Critique", durationSeconds: m(60) },
        ],
      },
      {
        title: "Weeks 5–6 · Delivery, Systems & Team",
        lessons: [
          { title: "The Delivery Excellence Framework", durationSeconds: m(15) },
          { title: "The Team & Delegation System", durationSeconds: m(15) },
          { title: "SOPs That Scale", durationSeconds: m(15) },
          { title: "Live 5 — Systems Mapping Workshop", durationSeconds: m(60) },
        ],
      },
      {
        title: "Weeks 7–8 · Financial Clarity & Growth Sprint",
        lessons: [
          { title: "Financial Command Dashboard", durationSeconds: m(15) },
          { title: "The 90-Day Growth Sprint Blueprint", durationSeconds: m(15) },
          { title: "Live 8 — 90-Day Sprint Planning + Graduation", durationSeconds: m(60) },
        ],
      },
    ],
  },
  {
    slug: "ceo-command-centre",
    name: "CEO Command Centre™",
    tagline: "90-Day Business Transformation Program",
    description:
      "A 90-day transformation: 42+ videos, 12 weekly live sessions, 4 private 1-on-1 calls and an optional in-person boardroom day. Application + qualification call required.",
    priceCents: 4999900,
    durationMonths: 3,
    tier: "high",
    type: "one_time",
    badgeColor: "gradient",
    requiresApplication: true,
    modules: [
      {
        title: "Phase 1 · Diagnose & Design (Weeks 1–3)",
        lessons: [
          { title: "The CEO-Level Business Audit", durationSeconds: m(20) },
          { title: "Strategic Business Redesign", durationSeconds: m(18) },
          { title: "1-on-1 #1 — Personalised Diagnosis + Custom Roadmap", durationSeconds: m(45) },
        ],
      },
      {
        title: "Phase 2 · Build & Install (Weeks 4–8)",
        lessons: [
          { title: "Advanced Lead Generation & Marketing Systems", durationSeconds: m(20) },
          { title: "High-Ticket Sales Mastery", durationSeconds: m(18) },
          { title: "Operations, Delivery & Team Mastery", durationSeconds: m(20) },
          { title: "1-on-1 #2 — Mid-Program Bottleneck Removal", durationSeconds: m(45) },
        ],
      },
      {
        title: "Phase 3 · Optimise & Scale (Weeks 9–12)",
        lessons: [
          { title: "Financial Mastery & Wealth Building", durationSeconds: m(18) },
          { title: "Automation & Scale Architecture", durationSeconds: m(15) },
          { title: "The CEO Lifestyle & Legacy", durationSeconds: m(12) },
          { title: "1-on-1 #4 — 90-Day Results Review + 12-Month Plan", durationSeconds: m(60) },
        ],
      },
    ],
  },
];

async function run() {
  for (const c of COURSES) {
    const existing = await db
      .select({ id: programs.id })
      .from(programs)
      .where(eq(programs.slug, c.slug))
      .limit(1);

    let courseId: string;
    if (existing.length > 0) {
      courseId = existing[0].id;
      await db
        .update(programs)
        .set({
          name: c.name,
          tagline: c.tagline,
          description: c.description,
          priceCents: c.priceCents,
          currency: "INR",
          durationMonths: c.durationMonths,
          tier: c.tier,
          type: c.type,
          badgeColor: c.badgeColor,
          requiresApplication: c.requiresApplication,
          status: "published",
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(programs.id, courseId));
      // rebuild modules/lessons for a clean idempotent state
      await db.delete(modules).where(eq(modules.courseId, courseId));
      console.log(`Updated course: ${c.name}`);
    } else {
      const [row] = await db
        .insert(programs)
        .values({
          slug: c.slug,
          name: c.name,
          tagline: c.tagline,
          description: c.description,
          priceCents: c.priceCents,
          currency: "INR",
          durationMonths: c.durationMonths,
          tier: c.tier,
          type: c.type,
          badgeColor: c.badgeColor,
          requiresApplication: c.requiresApplication,
          status: "published",
          isActive: true,
        })
        .returning({ id: programs.id });
      courseId = row.id;
      console.log(`Created course: ${c.name}`);
    }

    for (let mi = 0; mi < c.modules.length; mi++) {
      const ms = c.modules[mi];
      const [mod] = await db
        .insert(modules)
        .values({
          courseId,
          title: ms.title,
          description: ms.description ?? null,
          orderIndex: mi,
        })
        .returning({ id: modules.id });
      for (let li = 0; li < ms.lessons.length; li++) {
        const ls = ms.lessons[li];
        await db.insert(lessons).values({
          moduleId: mod.id,
          title: ls.title,
          videoUrl: PLACEHOLDER_VIDEO,
          durationSeconds: ls.durationSeconds,
          orderIndex: li,
        });
      }
    }
  }

  console.log("\nSeed complete.");
  const all = await db.select({ slug: programs.slug, name: programs.name }).from(programs);
  all.forEach((p) => console.log(`  ${p.slug} — ${p.name}`));
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
