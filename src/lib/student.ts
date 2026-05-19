import { and, eq, inArray, gte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users,
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

/** Stable, non-secret display id derived from the user uuid. */
function studentCode(userId: string, year: number): string {
  const digits = userId.replace(/\D/g, "").slice(0, 5).padStart(5, "0");
  return `EDS-${year}-${digits}`;
}

/**
 * Everything the student area needs, off the REAL marketplace model
 * (every `enrollments` row for this user → its program + live progress),
 * not the legacy single `students.assignedProgramId`.
 */
export async function getStudentSnapshot(
  clerkUserId: string,
): Promise<StudentSnapshot | null> {
  const [me] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      pointsBalance: users.pointsBalance,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.clerkId, clerkUserId))
    .limit(1);
  if (!me) return null;

  const enr = await db
    .select({
      enrollmentId: enrollments.id,
      programId: programs.id,
      name: programs.name,
      slug: programs.slug,
      tagline: programs.tagline,
      durationMonths: programs.durationMonths,
      createdAt: enrollments.createdAt,
    })
    .from(enrollments)
    .innerJoin(programs, eq(enrollments.programId, programs.id))
    .where(eq(enrollments.userId, me.id));

  // De-dupe by program (a re-enrol shouldn't show the course twice).
  const byProgram = new Map<string, (typeof enr)[number]>();
  for (const e of enr) if (!byProgram.has(e.programId)) byProgram.set(e.programId, e);
  const rows = [...byProgram.values()];

  // Batch progress: all lessons for all enrolled courses, then this user's
  // 100%-complete lessons among them.
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
      durationMonths: r.durationMonths,
      totalLessons: total,
      doneLessons: d,
      percent,
      completed: total > 0 && d === total,
    };
  });

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [{ n: newThisMonth }] = enr.length
    ? await db
        .select({ n: sql<number>`count(*)::int` })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.userId, me.id),
            gte(enrollments.createdAt, monthStart),
          ),
        )
    : [{ n: 0 }];

  const refRows = await db
    .select({ id: referrals.id })
    .from(referrals)
    .where(
      and(
        eq(referrals.referrerId, me.id),
        eq(referrals.status, "ACTIVATED"),
      ),
    );

  const completed = courses.filter((c) => c.completed).length;
  const fullName = me.fullName ?? me.email;

  return {
    userId: me.id,
    fullName,
    firstName: fullName.split(" ")[0],
    email: me.email,
    studentCode: studentCode(me.id, (me.createdAt ?? new Date()).getFullYear()),
    pointsBalance: me.pointsBalance,
    courses,
    counts: {
      activeCourses: courses.length,
      completed,
      lessonsDone: doneSet.size,
      certificates: completed,
      referrals: refRows.length,
      newThisMonth: Number(newThisMonth) || 0,
    },
  };
}
