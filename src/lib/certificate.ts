import { createHash } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  enrollments,
  programs,
  tenants,
  modules,
  lessons,
  lessonProgress,
  users,
} from "@/db/schema";

/**
 * Certificates are generated on demand from real completion data — there is
 * no certificates table yet (master spec §6.6 = Phase-2 migration). The
 * enrollment UUID is the unguessable credential key; the displayed cert
 * number + SHA-256 anchor hash are derived deterministically from it.
 */

export interface Certificate {
  completed: boolean;
  percent: number;
  certId: string;
  enrollmentId: string;
  name: string;
  courseTitle: string;
  courseSlug: string | null;
  programId: string;
  instituteName: string;
  tenantId: string | null;
  userId: string | null;
  issuedAt: Date;
  anchorHash: string;
}

export function certIdFor(enrollmentId: string, year: number): string {
  const hex = enrollmentId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `EDC-${year}-${hex}`;
}

export async function getCertificate(
  enrollmentId: string,
): Promise<Certificate | null> {
  const [enr] = await db
    .select({
      id: enrollments.id,
      programId: enrollments.programId,
      userId: enrollments.userId,
      fullName: enrollments.fullName,
      email: enrollments.email,
      createdAt: enrollments.createdAt,
    })
    .from(enrollments)
    .where(eq(enrollments.id, enrollmentId))
    .limit(1);
  if (!enr || !enr.programId) return null;

  const [course] = await db
    .select({
      name: programs.name,
      slug: programs.slug,
      tenantId: programs.tenantId,
    })
    .from(programs)
    .where(eq(programs.id, enr.programId))
    .limit(1);
  if (!course || !course.tenantId) return null;

  const [institute] = await db
    .select({ name: tenants.name })
    .from(tenants)
    .where(eq(tenants.id, course.tenantId))
    .limit(1);

  // Prefer the linked user's current name; fall back to the enrollment name.
  let name = enr.fullName;
  if (enr.userId) {
    const [u] = await db
      .select({ fullName: users.fullName, email: users.email })
      .from(users)
      .where(eq(users.id, enr.userId))
      .limit(1);
    if (u?.fullName) name = u.fullName;
  }

  // Completion = every lesson of the course at 100% for this learner.
  const mods = await db
    .select({ id: modules.id })
    .from(modules)
    .where(eq(modules.courseId, enr.programId));
  const modIds = mods.map((m) => m.id);
  const ls = modIds.length
    ? await db
        .select({ id: lessons.id })
        .from(lessons)
        .where(inArray(lessons.moduleId, modIds))
    : [];
  const lessonIds = ls.map((l) => l.id);

  let doneCount = 0;
  if (lessonIds.length && enr.userId) {
    const done = await db
      .select({ id: lessonProgress.id })
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, enr.userId),
          inArray(lessonProgress.lessonId, lessonIds),
          eq(lessonProgress.percentComplete, 100),
        ),
      );
    doneCount = done.length;
  }
  const total = lessonIds.length;
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);
  const completed = total > 0 && doneCount === total;

  const issuedAt = enr.createdAt ?? new Date();
  const certId = certIdFor(enr.id, issuedAt.getFullYear());
  const anchorHash = createHash("sha256")
    .update(
      `${certId}|${name}|${course.name}|${institute?.name ?? ""}|${issuedAt.toISOString().slice(0, 10)}`,
    )
    .digest("hex");

  return {
    completed,
    percent,
    certId,
    enrollmentId: enr.id,
    name: name ?? enr.email,
    courseTitle: course.name,
    courseSlug: course.slug,
    programId: enr.programId,
    instituteName: institute?.name ?? "eurodigital.coach",
    tenantId: course.tenantId,
    userId: enr.userId,
    issuedAt,
    anchorHash,
  };
}
