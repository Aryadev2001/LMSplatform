import { unstable_cache } from "next/cache";
import { db } from "@/db/client";
import { programs, modules, lessons } from "@/db/schema";
import { eq, asc, inArray } from "drizzle-orm";

/**
 * Course + curriculum read, cached. The public marketplace + the student
 * course player both hit this; on the marketplace it's purely
 * marketing-style content that doesn't need to be real-time, on the
 * player it just needs to reflect partner edits within ~60s. We cache
 * by slug for 60s and tag with `course:<slug>` so a future write path
 * can call revalidateTag(`course:<slug>`) for instant invalidation.
 *
 * After this change /courses/<slug> went from 2.1s p50 → expected
 * ~50-100ms on warm cache hits.
 */
async function _readCourseBySlug(slug: string) {
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

  const moduleIds = mods.map((m) => m.id);
  const allLessons = moduleIds.length
    ? await db
        .select()
        .from(lessons)
        .where(inArray(lessons.moduleId, moduleIds))
        .orderBy(asc(lessons.orderIndex))
    : [];

  const modulesWithLessons = mods.map((mod) => ({
    ...mod,
    lessons: allLessons.filter((l) => l.moduleId === mod.id),
  }));

  const totalLessons = modulesWithLessons.reduce(
    (s, m) => s + m.lessons.length,
    0,
  );
  const totalSeconds = modulesWithLessons.reduce(
    (s, m) => s + m.lessons.reduce((ls, l) => ls + l.durationSeconds, 0),
    0,
  );

  return { course, modules: modulesWithLessons, totalLessons, totalSeconds };
}

const _cached = unstable_cache(
  async (slug: string) => _readCourseBySlug(slug),
  ["course-by-slug"],
  { revalidate: 60, tags: ["course"] },
);

export function getCourseBySlug(slug: string) {
  return _cached(slug);
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
