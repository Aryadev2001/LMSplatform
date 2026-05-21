import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { courseReviews, users, programs } from "@/db/schema";

/**
 * Read helpers for course reviews. Tenant scoping is enforced via the
 * caller's WHERE on programs.tenantId (reviews carry a denormalized
 * tenant_id but we always join through the course for query-plan
 * symmetry with the editor side).
 */

export interface CourseRating {
  avg: number;
  count: number;
}

export const EMPTY_RATING: CourseRating = { avg: 0, count: 0 };

export async function getCourseRating(
  courseId: string,
): Promise<CourseRating> {
  const [row] = await db
    .select({
      avg: sql<number>`coalesce(avg(rating)::numeric(3,2), 0)::float8`,
      count: sql<number>`count(*)::int`,
    })
    .from(courseReviews)
    .where(eq(courseReviews.courseId, courseId));
  return { avg: Number(row?.avg ?? 0), count: Number(row?.count ?? 0) };
}

/** Bulk ratings keyed by courseId. Single query — for listing pages. */
export async function getCourseRatingsBulk(
  courseIds: string[],
): Promise<Record<string, CourseRating>> {
  if (courseIds.length === 0) return {};
  const rows = await db
    .select({
      courseId: courseReviews.courseId,
      avg: sql<number>`coalesce(avg(rating)::numeric(3,2), 0)::float8`,
      count: sql<number>`count(*)::int`,
    })
    .from(courseReviews)
    .where(inArray(courseReviews.courseId, courseIds))
    .groupBy(courseReviews.courseId);
  const out: Record<string, CourseRating> = {};
  for (const r of rows) out[r.courseId] = { avg: Number(r.avg), count: Number(r.count) };
  return out;
}

export interface ReviewListItem {
  id: string;
  rating: number;
  body: string | null;
  createdAt: Date;
  userId: string;
  authorName: string | null;
}

export async function listCourseReviews(
  courseId: string,
  opts?: { limit?: number },
): Promise<ReviewListItem[]> {
  const rows = await db
    .select({
      id: courseReviews.id,
      rating: courseReviews.rating,
      body: courseReviews.body,
      createdAt: courseReviews.createdAt,
      userId: courseReviews.userId,
      authorName: users.fullName,
    })
    .from(courseReviews)
    .innerJoin(users, eq(users.id, courseReviews.userId))
    .where(eq(courseReviews.courseId, courseId))
    .orderBy(desc(courseReviews.createdAt))
    .limit(opts?.limit ?? 20);
  return rows;
}

/** Reviews across every published course of a tenant — for the storefront. */
export async function listTenantReviews(
  tenantId: string,
  opts?: { limit?: number },
): Promise<(ReviewListItem & { courseTitle: string; courseSlug: string | null })[]> {
  const rows = await db
    .select({
      id: courseReviews.id,
      rating: courseReviews.rating,
      body: courseReviews.body,
      createdAt: courseReviews.createdAt,
      userId: courseReviews.userId,
      authorName: users.fullName,
      courseTitle: programs.name,
      courseSlug: programs.slug,
    })
    .from(courseReviews)
    .innerJoin(users, eq(users.id, courseReviews.userId))
    .innerJoin(programs, eq(programs.id, courseReviews.courseId))
    .where(
      and(
        eq(courseReviews.tenantId, tenantId),
        eq(programs.tenantId, tenantId),
      ),
    )
    .orderBy(desc(courseReviews.createdAt))
    .limit(opts?.limit ?? 20);
  return rows;
}

/** The current user's existing review for a course, if any. */
export async function getMyReview(
  userId: string,
  courseId: string,
): Promise<{ id: string; rating: number; body: string | null } | null> {
  const [row] = await db
    .select({
      id: courseReviews.id,
      rating: courseReviews.rating,
      body: courseReviews.body,
    })
    .from(courseReviews)
    .where(
      and(
        eq(courseReviews.userId, userId),
        eq(courseReviews.courseId, courseId),
      ),
    )
    .limit(1);
  return row ?? null;
}
