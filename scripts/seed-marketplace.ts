/**
 * Demo marketplace seed — makes the public site (home / explore / institute
 * storefronts / course pages) look full and convincing.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/seed-marketplace.ts
 *
 * Idempotent: re-running skips anything that already exists (by slug /
 * clerkId). To remove later, delete the tenants whose slug is in
 * DEMO_TENANT_SLUGS (their courses/modules/lessons cascade) and the users
 * whose clerk_id starts with "seed_stu_".
 *
 * NOTE: the institute names below are well-known third-party brands used
 * ONLY as realistic mockup placeholders for a demo. They must be replaced
 * (or removed) before any public launch — using real trademarks implies an
 * affiliation that doesn't exist.
 */
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { tenants, programs, modules, lessons, users } from "../src/db/schema";

type Tier = "low" | "mid" | "high";
type Ctype = "one_time" | "subscription";

interface Course {
  title: string;
  tagline: string;
  priceRupees: number; // 0 = free
  months: number;
  tier: Tier;
  type: Ctype;
}
interface Brand {
  name: string;
  slug: string;
  tagline: string;
  primary: string;
  secondary: string;
  courses: Course[];
}

const BRANDS: Brand[] = [
  {
    name: "Google Career Certificates",
    slug: "google-career",
    tagline: "Job-ready skills from Google. No degree or experience required.",
    primary: "#4285F4",
    secondary: "#34A853",
    courses: [
      { title: "Google Data Analytics", tagline: "Spreadsheets, SQL, R & Tableau — get job-ready in 6 months.", priceRupees: 3999, months: 6, tier: "mid", type: "one_time" },
      { title: "Google UX Design", tagline: "Design wireframes, prototypes and a portfolio recruiters notice.", priceRupees: 4999, months: 6, tier: "mid", type: "one_time" },
      { title: "Google IT Support", tagline: "Troubleshooting, networking, OS and systems administration.", priceRupees: 2999, months: 5, tier: "low", type: "one_time" },
      { title: "Google Project Management", tagline: "Agile, Scrum and stakeholder management, hands-on.", priceRupees: 3999, months: 6, tier: "mid", type: "one_time" },
      { title: "Intro to Generative AI", tagline: "What LLMs are and how to use them responsibly.", priceRupees: 0, months: 1, tier: "low", type: "one_time" },
      { title: "Google Cloud Digital Leader", tagline: "Cloud fundamentals for non-engineers.", priceRupees: 5999, months: 3, tier: "high", type: "one_time" },
    ],
  },
  {
    name: "AWS Skill Builder",
    slug: "aws-skill-builder",
    tagline: "Build in-demand cloud skills from Amazon Web Services.",
    primary: "#FF9900",
    secondary: "#232F3E",
    courses: [
      { title: "AWS Certified Cloud Practitioner", tagline: "Your first AWS certification — foundational cloud.", priceRupees: 4999, months: 2, tier: "low", type: "one_time" },
      { title: "AWS Solutions Architect Associate", tagline: "Design resilient, cost-optimized architectures.", priceRupees: 12999, months: 4, tier: "high", type: "one_time" },
      { title: "Serverless with Lambda", tagline: "Event-driven apps with Lambda, API Gateway & DynamoDB.", priceRupees: 6999, months: 2, tier: "mid", type: "one_time" },
      { title: "Cloud Foundations (Free)", tagline: "Start here — free intro to the AWS cloud.", priceRupees: 0, months: 1, tier: "low", type: "one_time" },
      { title: "AWS Pro Subscription", tagline: "Unlimited labs & paths, billed monthly.", priceRupees: 1499, months: 1, tier: "mid", type: "subscription" },
    ],
  },
  {
    name: "Meta Blueprint",
    slug: "meta-blueprint",
    tagline: "Master marketing on Facebook, Instagram & WhatsApp.",
    primary: "#0866FF",
    secondary: "#1C2B33",
    courses: [
      { title: "Meta Social Media Marketing", tagline: "Run high-ROAS campaigns end to end.", priceRupees: 3499, months: 5, tier: "mid", type: "one_time" },
      { title: "Performance Marketing Pro", tagline: "Pixels, conversions API and creative testing.", priceRupees: 5499, months: 3, tier: "high", type: "one_time" },
      { title: "Instagram Growth Basics", tagline: "Free starter — content that actually grows.", priceRupees: 0, months: 1, tier: "low", type: "one_time" },
      { title: "WhatsApp Business at Scale", tagline: "Catalogs, automation and the Cloud API.", priceRupees: 2999, months: 2, tier: "mid", type: "one_time" },
    ],
  },
  {
    name: "IIT Bombay Online",
    slug: "iit-bombay-online",
    tagline: "Rigorous engineering & science from one of India's best.",
    primary: "#003B6F",
    secondary: "#E87722",
    courses: [
      { title: "Data Structures & Algorithms", tagline: "The interview-grade DSA course, in C++ & Python.", priceRupees: 6999, months: 4, tier: "high", type: "one_time" },
      { title: "Machine Learning Foundations", tagline: "Math-first ML: regression to neural nets.", priceRupees: 8999, months: 5, tier: "high", type: "one_time" },
      { title: "Python for Engineers", tagline: "From zero to NumPy/Pandas confidence.", priceRupees: 1999, months: 3, tier: "low", type: "one_time" },
      { title: "Intro to IoT", tagline: "Sensors, microcontrollers and the cloud.", priceRupees: 0, months: 2, tier: "low", type: "one_time" },
      { title: "GATE CS Crash Course", tagline: "Targeted prep for the GATE CS paper.", priceRupees: 4499, months: 4, tier: "mid", type: "one_time" },
    ],
  },
  {
    name: "Stanford Online",
    slug: "stanford-online",
    tagline: "Graduate-level learning, open to everyone.",
    primary: "#8C1515",
    secondary: "#2E2D29",
    courses: [
      { title: "Machine Learning Specialization", tagline: "The classic — supervised, unsupervised & best practices.", priceRupees: 9999, months: 4, tier: "high", type: "one_time" },
      { title: "Algorithms: Design & Analysis", tagline: "Divide & conquer, graphs, greedy, DP.", priceRupees: 7499, months: 4, tier: "high", type: "one_time" },
      { title: "Intro to Statistics", tagline: "Reason about data and uncertainty.", priceRupees: 0, months: 2, tier: "low", type: "one_time" },
      { title: "Entrepreneurship Essentials", tagline: "From idea to a fundable company.", priceRupees: 5999, months: 3, tier: "mid", type: "one_time" },
    ],
  },
  {
    name: "Microsoft Learn",
    slug: "microsoft-learn",
    tagline: "Skill up on Azure, Power Platform & AI.",
    primary: "#0067B8",
    secondary: "#5E5E5E",
    courses: [
      { title: "Azure Fundamentals (AZ-900)", tagline: "Cloud concepts and core Azure services.", priceRupees: 3999, months: 2, tier: "low", type: "one_time" },
      { title: "Azure AI Engineer", tagline: "Build with Azure OpenAI & Cognitive Services.", priceRupees: 11999, months: 4, tier: "high", type: "one_time" },
      { title: "Power BI Data Analyst", tagline: "Model, visualize and ship dashboards.", priceRupees: 4999, months: 3, tier: "mid", type: "one_time" },
      { title: "Copilot for Productivity (Free)", tagline: "Get more done with Microsoft Copilot.", priceRupees: 0, months: 1, tier: "low", type: "one_time" },
    ],
  },
  {
    name: "upGrad",
    slug: "upgrad",
    tagline: "Outcome-driven career programs for working professionals.",
    primary: "#DA1A32",
    secondary: "#1F1F1F",
    courses: [
      { title: "Full-Stack Development Bootcamp", tagline: "MERN, system design and a real capstone.", priceRupees: 14999, months: 8, tier: "high", type: "one_time" },
      { title: "Digital Marketing Pro", tagline: "SEO, SEM, social and analytics.", priceRupees: 4999, months: 4, tier: "mid", type: "one_time" },
      { title: "Product Management 101", tagline: "Discovery, roadmaps and metrics.", priceRupees: 0, months: 1, tier: "low", type: "one_time" },
      { title: "Data Science Career Track", tagline: "Python, ML and storytelling with data.", priceRupees: 12999, months: 7, tier: "high", type: "one_time" },
    ],
  },
  {
    name: "Great Learning",
    slug: "great-learning",
    tagline: "Hands-on programs with mentor support.",
    primary: "#1A73E8",
    secondary: "#0B5394",
    courses: [
      { title: "AI & ML for Leaders", tagline: "Strategy, use-cases and governance.", priceRupees: 7999, months: 3, tier: "high", type: "one_time" },
      { title: "Excel to Analytics", tagline: "From spreadsheets to real analysis.", priceRupees: 1499, months: 2, tier: "low", type: "one_time" },
      { title: "Cybersecurity Essentials", tagline: "Threats, defenses and a hands-on lab.", priceRupees: 5999, months: 4, tier: "mid", type: "one_time" },
      { title: "Intro to Cloud (Free)", tagline: "A gentle, free on-ramp to the cloud.", priceRupees: 0, months: 1, tier: "low", type: "one_time" },
    ],
  },
];

export const DEMO_TENANT_SLUGS = BRANDS.map((b) => b.slug);

function courseSlug(brandSlug: string, title: string): string {
  const t = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
  return `${brandSlug}-${t}`;
}

async function ensureTenant(b: Brand): Promise<string> {
  const [existing] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, b.slug))
    .limit(1);
  if (existing) return existing.id;
  const [row] = await db
    .insert(tenants)
    .values({
      name: b.name,
      slug: b.slug,
      heroTagline: b.tagline,
      brandPrimaryColor: b.primary,
      brandSecondaryColor: b.secondary,
      status: "ACTIVE",
    })
    .returning({ id: tenants.id });
  return row.id;
}

async function ensureCourse(tenantId: string, brandSlug: string, c: Course) {
  const slug = courseSlug(brandSlug, c.title);
  const [exists] = await db
    .select({ id: programs.id })
    .from(programs)
    .where(eq(programs.slug, slug))
    .limit(1);
  if (exists) return;

  const [prog] = await db
    .insert(programs)
    .values({
      slug,
      name: c.title,
      tagline: c.tagline,
      description: `${c.title} — ${c.tagline} A hands-on, project-based program with lifetime access and a verifiable certificate on completion.`,
      priceCents: c.priceRupees * 100,
      currency: "INR",
      durationMonths: c.months,
      tier: c.tier,
      type: c.type,
      status: "published",
      isActive: true,
      isMasterCourse: false,
      tenantId,
    })
    .returning({ id: programs.id });

  // Light, believable curriculum so course pages aren't empty.
  for (let m = 0; m < 3; m++) {
    const [mod] = await db
      .insert(modules)
      .values({
        courseId: prog.id,
        title:
          ["Foundations", "Core skills", "Real-world project"][m] ?? `Module ${m + 1}`,
        description: "Guided lessons with downloadable resources.",
        orderIndex: m,
      })
      .returning({ id: modules.id });
    await db.insert(lessons).values(
      [0, 1, 2, 3].map((li) => ({
        moduleId: mod.id,
        title: `Lesson ${m + 1}.${li + 1}`,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        durationSeconds: 600 + li * 120,
        orderIndex: li,
      })),
    );
  }
}

async function ensureLearners(count: number) {
  for (let i = 0; i < count; i++) {
    const clerkId = `seed_stu_${i}`;
    const [exists] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);
    if (exists) continue;
    await db.insert(users).values({
      clerkId,
      email: `seed.learner.${i}@demo.eurodigital.coach`,
      fullName: `Demo Learner ${i + 1}`,
      role: "STUDENT",
      isSuperAdmin: false,
    });
  }
}

async function main() {
  let courses = 0;
  for (const b of BRANDS) {
    const tenantId = await ensureTenant(b);
    for (const c of b.courses) {
      await ensureCourse(tenantId, b.slug, c);
      courses += 1;
    }
    console.log(`  ✓ ${b.name} (${b.courses.length} courses)`);
  }
  console.log("Seeding demo learners…");
  await ensureLearners(280);
  console.log(
    `✓ Done. ${BRANDS.length} institutes, ~${courses} courses, 280 learners.`,
  );
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
