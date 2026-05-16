import { db } from "@/db/client";
import { programs, modules, lessons } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function getCourseBySlug(slug: string) {
  const [course] = await db
    .select()
    .from(programs)
    .where(eq(programs.slug, slug))
    .limit(1);
  if (!course) return null;

  const mods = await db
    .select()
    .from(modules)
    .where(eq(modules.courseId, course.id))
    .orderBy(asc(modules.orderIndex));

  const allLessons = await db
    .select()
    .from(lessons)
    .orderBy(asc(lessons.orderIndex));

  const modulesWithLessons = mods.map((mod) => ({
    ...mod,
    lessons: allLessons.filter((l) => l.moduleId === mod.id),
  }));

  const totalLessons = modulesWithLessons.reduce((s, m) => s + m.lessons.length, 0);
  const totalSeconds = modulesWithLessons.reduce(
    (s, m) => s + m.lessons.reduce((ls, l) => ls + l.durationSeconds, 0),
    0,
  );

  return { course, modules: modulesWithLessons, totalLessons, totalSeconds };
}

export function formatInr(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export function formatRuntime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const mn = Math.round((totalSeconds % 3600) / 60);
  return h > 0 ? `${h}h ${mn}m` : `${mn}m`;
}

export function tierBadgeStyle(badgeColor: string | null) {
  if (badgeColor === "gradient") {
    return { background: "linear-gradient(135deg, #8CC63F 0%, #1AADE0 100%)", color: "#fff" };
  }
  return { background: badgeColor ?? "#8CC63F", color: "#0F172A" };
}
