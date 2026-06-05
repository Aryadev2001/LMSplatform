import { cache } from "react";
import { and, eq, inArray, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users,
  tenants,
  enrollments,
  programs,
  modules,
  lessons,
  lessonProgress,
  referrals,
} from "@/db/schema";

export interface StudentCourse {
  enrollmentId: string;
  programId: string;
  name: string;
  slug: string | null;
  tagline: string | null;
  imageUrl: string | null;
  instituteName: string | null;
  durationMonths: number;
  totalLessons: number;
  doneLessons: number;
  percent: number;
  completed: boolean;
}

export interface StudentSnapshot {
  userId: string;
  fullName: string;
  firstName: string;
  email: string;
  studentCode: string;
  pointsBalance: number;
  courses: StudentCourse[];
  counts: {
    activeCourses: number;
    completed: number;
    lessonsDone: number;
    certificates: number;
    referrals: number;
    newThisMonth: number;
  };
}

/**
 * The persisted, unique, tenant-scoped student id. Lazily assigned on
 * first read if missing (idempotent under the unique index + concurrent
 * calls) so every student that touches the dashboard has a stable record
 * key. Format: "<tenantslug>-<6 base36>".
 */
export async function ensureStudentCode(
  userId: string,
  tenantId: string | null,
): Promise<string> {
  let slug = "eds";
  if (tenantId) {
    const [t] = await db
      .select({ slug: tenants.slug })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    const cleaned = t?.slug
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 12);
    if (cleaned) slug = cleaned;
  }

  for (let i = 0; i < 6; i++) {
    const code = `${slug}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const [row] = await db
        .update(users)
        .set({ studentCode: code })
        .where(and(eq(users.id, userId), isNull(users.studentCode)))
        .returning({ code: users.studentCode });
      if (row?.code) return row.code;
      // No row updated → a code already exists for this user; return it.
      const [u] = await db
        .select({ code: users.studentCode })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (u?.code) return u.code;
    } catch {
      // Unique collision on the generated code — retry with a new one.
    }
  }
  return `${slug}-${userId.slice(0, 6)}`;
}

/**
 * Everything the student area needs, off the REAL marketplace model
 * (every `enrollments` row for this user → its program + live progress),
 * not the legacy single `students.assignedProgramId`.
 *
 * Cached + parallelised:
 *   - cache() so layout + page share one fetch per request.
 *   - Once we know users.id, the independent reads (enrollments-with-
 *     programs, monthly-count, referrals, studentCode mint) all fan out
 *     in parallel. The lesson-progress chain (modules → lessons →
 *     progress) stays sequential because each step depends on the
 *     previous step's IDs.
 */
export const getStudentSnapshot = cache(
  async (clerkUserId: string): Promise<StudentSnapshot | null> => {
    const [me] = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        pointsBalance: users.pointsBalance,
        createdAt: users.createdAt,
        tenantId: users.tenantId,
        studentCode: users.studentCode,
      })
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);
    if (!me) return null;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // Fan-out: every read below only needs me.id (and DOES NOT depend on
    // each other). One round-trip in parallel beats 3 sequential.
    const [enr, monthlyCountRows, refRows, mintedCode] = await Promise.all([
      db
        .select({
          enrollmentId: enrollments.id,
          programId: programs.id,
          name: programs.name,
          slug: programs.slug,
          tagline: programs.tagline,
          imageUrl: programs.imageUrl,
          instituteName: tenants.name,
          durationMonths: programs.durationMonths,
          createdAt: enrollments.createdAt,
        })
        .from(enrollments)
        .innerJoin(programs, eq(enrollments.programId, programs.id))
        .leftJoin(tenants, eq(programs.tenantId, tenants.id))
        .where(eq(enrollments.userId, me.id)),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.userId, me.id),
            gte(enrollments.createdAt, monthStart),
          ),
        ),
      db
        .select({ id: referrals.id })
        .from(referrals)
        .where(
          and(
            eq(referrals.referrerId, me.id),
            eq(referrals.status, "ACTIVATED"),
          ),
        ),
      me.studentCode
        ? Promise.resolve(me.studentCode)
        : ensureStudentCode(me.id, me.tenantId),
    ]);

    // De-dupe by program (a re-enrol shouldn't show the course twice).
    const byProgram = new Map<string, (typeof enr)[number]>();
    for (const e of enr) if (!byProgram.has(e.programId)) byProgram.set(e.programId, e);
    const rows = [...byProgram.values()];

    // Progress is the only chain that's strictly sequential: modules
    // need programIds, lessons need moduleIds, progress needs lessonIds.
    const programIds = rows.map((r) => r.programId);
    const mods = programIds.length
      ? await db
          .select({ id: modules.id, courseId: modules.courseId })
          .from(modules)
          .where(inArray(modules.courseId, programIds))
      : [];
    const modIds = mods.map((m) => m.id);
    const modCourse = new Map(mods.map((m) => [m.id, m.courseId]));

    const courseLessons = modIds.length
      ? await db
          .select({ id: lessons.id, moduleId: lessons.moduleId })
          .from(lessons)
          .where(inArray(lessons.moduleId, modIds))
      : [];
    const lessonCourse = new Map<string, string>();
    for (const l of courseLessons) {
      const cid = modCourse.get(l.moduleId);
      if (cid) lessonCourse.set(l.id, cid);
    }
    const lessonIds = courseLessons.map((l) => l.id);

    const done = lessonIds.length
      ? await db
          .select({ lessonId: lessonProgress.lessonId })
          .from(lessonProgress)
          .where(
            and(
              eq(lessonProgress.userId, me.id),
              inArray(lessonProgress.lessonId, lessonIds),
              eq(lessonProgress.percentComplete, 100),
            ),
          )
      : [];
    const doneSet = new Set(done.map((d) => d.lessonId));

    const totalByCourse = new Map<string, number>();
    const doneByCourse = new Map<string, number>();
    for (const lid of lessonIds) {
      const cid = lessonCourse.get(lid)!;
      totalByCourse.set(cid, (totalByCourse.get(cid) ?? 0) + 1);
      if (doneSet.has(lid))
        doneByCourse.set(cid, (doneByCourse.get(cid) ?? 0) + 1);
    }

    const courses: StudentCourse[] = rows.map((r) => {
      const total = totalByCourse.get(r.programId) ?? 0;
      const d = doneByCourse.get(r.programId) ?? 0;
      const percent = total === 0 ? 0 : Math.round((d / total) * 100);
      return {
        enrollmentId: r.enrollmentId,
        programId: r.programId,
        name: r.name,
        slug: r.slug,
        tagline: r.tagline,
        imageUrl: r.imageUrl,
        instituteName: r.instituteName,
        durationMonths: r.durationMonths,
        totalLessons: total,
        doneLessons: d,
        percent,
        completed: total > 0 && d === total,
      };
    });

    const newThisMonth = enr.length ? Number(monthlyCountRows[0]?.n ?? 0) : 0;
    const completed = courses.filter((c) => c.completed).length;
    const fullName = me.fullName ?? me.email;

    return {
      userId: me.id,
      fullName,
      firstName: fullName.split(" ")[0],
      email: me.email,
      studentCode: mintedCode,
      pointsBalance: me.pointsBalance,
      courses,
      counts: {
        activeCourses: courses.length,
        completed,
        lessonsDone: doneSet.size,
        certificates: completed,
        referrals: refRows.length,
        newThisMonth: newThisMonth || 0,
      },
    };
  },
);
