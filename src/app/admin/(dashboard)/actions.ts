"use server";

import { z } from "zod";
import { db } from "@/db/client";
import { programs, students, users, tenants, enrollments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireRole, isStudentRole } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { hasFeature } from "@/lib/tier-lock";
import { recordAudit } from "@/lib/audit";
import { syncPlanToGateway } from "@/lib/payments/sync-plan";

/** Auto-mirror a plan into the tenant's gateway, but only if one is
 *  connected. Never throws — failures are stored on the program for retry. */
async function autoSyncPlan(tenantId: string, programId: string) {
  const [t] = await db
    .select({ provider: tenants.paymentProvider })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  if (!t?.provider) return;
  await syncPlanToGateway(tenantId, programId);
}

// ---------- Program CRUD ----------
const COURSE_FEATURE_KEYS = [
  "certificate",
  "q_bank",
  "hands_on",
  "mentor_qa",
] as const;
const courseFeatureEnum = z.enum(COURSE_FEATURE_KEYS);

const ProgramSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  priceCents: z.number().int().min(0),
  currency: z.string().length(3).default("USD"),
  durationMonths: z.number().int().min(1).max(60),
  isActive: z.boolean().default(true),
  imageUrl: z.string().trim().max(2000).optional().or(z.literal("")),
  // ---- 0013 course extensions ----
  language: z.enum(["en", "ar", "hi"]).default("en"),
  features: z.array(courseFeatureEnum).default([]),
  introVideoUrl: z.string().trim().max(2000).optional().or(z.literal("")),
  workshopVideoUrl: z.string().trim().max(2000).optional().or(z.literal("")),
  totalDurationHours: z.number().int().min(0).max(10000).default(0),
  disclaimer: z.string().max(4000).optional().or(z.literal("")),
  termsHtml: z.string().max(20000).optional().or(z.literal("")),
  certificateTemplateUrl: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal("")),
});

export type ProgramResult = { success: true; id: string } | { success: false; error: string };

/**
 * Build a URL-safe, unique-ish course slug from its name. A short random
 * suffix guarantees uniqueness against the programs_slug_idx unique index
 * without a read-modify-write loop. A course with NO slug is unreachable on
 * the marketplace (the storefront card falls back to /sign-in), so every
 * course MUST get one at creation time.
 */
function makeCourseSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "course"}-${suffix}`;
}

/** Charging for a course requires the `paid_courses` feature (Standard+).
 *  Basic partners can still publish FREE courses (price 0) and see who
 *  enrolls. Enforced server-side here so the price field UI hint can't be
 *  bypassed; super-admins pass (hasFeature returns true for them). */
async function assertPriceAllowed(
  _tenantId: string,
  priceCents: number,
): Promise<ProgramResult | null> {
  if (priceCents > 0 && !(await hasFeature("paid_courses"))) {
    return {
      success: false,
      error:
        "Publishing a paid course requires the Standard plan or higher. Upgrade in Billing, or set the price to 0 to publish it free.",
    };
  }
  return null;
}

export async function createProgram(input: z.infer<typeof ProgramSchema>): Promise<ProgramResult> {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  const parsed = ProgramSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const blocked = await assertPriceAllowed(tenantId, parsed.data.priceCents);
  if (blocked) return blocked;
  const [row] = await db
    .insert(programs)
    .values({
      name: parsed.data.name,
      description: parsed.data.description || null,
      priceCents: parsed.data.priceCents,
      currency: parsed.data.currency,
      durationMonths: parsed.data.durationMonths,
      isActive: parsed.data.isActive,
      imageUrl: parsed.data.imageUrl || null,
      language: parsed.data.language,
      features: parsed.data.features,
      introVideoUrl: parsed.data.introVideoUrl || null,
      workshopVideoUrl: parsed.data.workshopVideoUrl || null,
      totalDurationHours: parsed.data.totalDurationHours,
      disclaimer: parsed.data.disclaimer || null,
      termsHtml: parsed.data.termsHtml || null,
      certificateTemplateUrl: parsed.data.certificateTemplateUrl || null,
      tenantId,
      slug: makeCourseSlug(parsed.data.name),
      // Auto-published: an institute's course goes live on the marketplace the
      // moment it's created (status published + approvedAt set). Super-admins
      // retain the ability to unpublish/withdraw it from the console, and the
      // partner can set isActive=false to take it down themselves.
      status: "published",
      approvedAt: new Date(),
    })
    .returning({ id: programs.id });
  await recordAudit({
    action: "program.create",
    targetType: "program",
    targetId: row.id,
    metadata: {
      tenantId,
      name: parsed.data.name,
      priceCents: parsed.data.priceCents,
      free: parsed.data.priceCents === 0,
      currency: parsed.data.currency,
    },
  });
  await autoSyncPlan(tenantId, row.id);
  revalidatePath("/admin/programs");
  // Flush cached marketplace + course-detail reads so changes show up
  // instantly on /, /explore, /courses/<slug>, /institute/<slug>.
  // Next 16 requires a cache-profile arg; "default" matches the
  // unstable_cache defaults.
  revalidateTag("course", "default");
  revalidateTag("marketplace", "default");
  revalidateTag("tenant", "default");
  return { success: true, id: row.id };
}

export async function updateProgram(
  id: string,
  input: z.infer<typeof ProgramSchema>,
): Promise<ProgramResult> {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  const parsed = ProgramSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const blocked = await assertPriceAllowed(tenantId, parsed.data.priceCents);
  if (blocked) return blocked;
  await db
    .update(programs)
    .set({
      name: parsed.data.name,
      description: parsed.data.description || null,
      priceCents: parsed.data.priceCents,
      currency: parsed.data.currency,
      durationMonths: parsed.data.durationMonths,
      isActive: parsed.data.isActive,
      imageUrl: parsed.data.imageUrl || null,
      language: parsed.data.language,
      features: parsed.data.features,
      introVideoUrl: parsed.data.introVideoUrl || null,
      workshopVideoUrl: parsed.data.workshopVideoUrl || null,
      totalDurationHours: parsed.data.totalDurationHours,
      disclaimer: parsed.data.disclaimer || null,
      termsHtml: parsed.data.termsHtml || null,
      certificateTemplateUrl: parsed.data.certificateTemplateUrl || null,
      updatedAt: new Date(),
    })
    .where(and(eq(programs.id, id), eq(programs.tenantId, tenantId)));
  await recordAudit({
    action: "program.update",
    targetType: "program",
    targetId: id,
    metadata: {
      tenantId,
      name: parsed.data.name,
      priceCents: parsed.data.priceCents,
      free: parsed.data.priceCents === 0,
      currency: parsed.data.currency,
    },
  });
  await autoSyncPlan(tenantId, id);
  revalidatePath("/admin/programs");
  // Flush cached marketplace + course-detail reads so changes show up
  // instantly on /, /explore, /courses/<slug>, /institute/<slug>.
  // Next 16 requires a cache-profile arg; "default" matches the
  // unstable_cache defaults.
  revalidateTag("course", "default");
  revalidateTag("marketplace", "default");
  revalidateTag("tenant", "default");
  return { success: true, id };
}

/** Manual "create/refresh in payment gateway" for one plan (retry button). */
export async function syncProgramGateway(
  programId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  const r = await syncPlanToGateway(tenantId, programId);
  await recordAudit({
    action: "plan.gateway_sync",
    targetType: "program",
    targetId: programId,
    metadata: { ok: r.ok, ...(r.ok ? {} : { error: r.error }) },
  });
  revalidatePath("/admin/programs");
  // Flush cached marketplace + course-detail reads so changes show up
  // instantly on /, /explore, /courses/<slug>, /institute/<slug>.
  // Next 16 requires a cache-profile arg; "default" matches the
  // unstable_cache defaults.
  revalidateTag("course", "default");
  revalidateTag("marketplace", "default");
  revalidateTag("tenant", "default");
  return r.ok ? { success: true } : { success: false, error: r.error };
}

export async function toggleProgramActive(id: string, isActive: boolean) {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  await db
    .update(programs)
    .set({ isActive, updatedAt: new Date() })
    .where(and(eq(programs.id, id), eq(programs.tenantId, tenantId)));
  await recordAudit({
    action: isActive ? "program.activate" : "program.deactivate",
    targetType: "program",
    targetId: id,
    metadata: { tenantId, isActive },
  });
  revalidatePath("/admin/programs");
  // Flush cached marketplace + course-detail reads so changes show up
  // instantly on /, /explore, /courses/<slug>, /institute/<slug>.
  // Next 16 requires a cache-profile arg; "default" matches the
  // unstable_cache defaults.
  revalidateTag("course", "default");
  revalidateTag("marketplace", "default");
  revalidateTag("tenant", "default");
  return { success: true as const };
}

// ---------- Assign student to a program/course ----------
const AssignSchema = z.object({
  studentUserId: z.uuid(),
  programId: z.uuid().nullable(),
});

export async function assignStudent(input: z.infer<typeof AssignSchema>) {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  const parsed = AssignSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, parsed.data.studentUserId))
    .limit(1);
  if (
    existing.length === 0 ||
    !isStudentRole(existing[0].role) ||
    existing[0].tenantId !== tenantId
  ) {
    return { success: false as const, error: "Student not found" };
  }

  // The course being assigned must also belong to this tenant (acceptance #6).
  if (parsed.data.programId) {
    const [prog] = await db
      .select({ id: programs.id })
      .from(programs)
      .where(
        and(eq(programs.id, parsed.data.programId), eq(programs.tenantId, tenantId)),
      )
      .limit(1);
    if (!prog) {
      return { success: false as const, error: "Course not found in your workspace." };
    }
  }

  const existingStudent = await db
    .select()
    .from(students)
    .where(eq(students.userId, parsed.data.studentUserId))
    .limit(1);
  if (existingStudent.length === 0) {
    await db.insert(students).values({
      userId: parsed.data.studentUserId,
      assignedProgramId: parsed.data.programId,
    });
  } else {
    await db
      .update(students)
      .set({ assignedProgramId: parsed.data.programId })
      .where(eq(students.userId, parsed.data.studentUserId));
  }

  // Create the REAL entitlement. The dashboard ("My courses") and the course
  // player gate on an `enrollments` row, NOT the legacy assignedProgramId slot,
  // so without this an admin-assigned course never appeared for the student.
  if (parsed.data.programId) {
    const u = existing[0];
    const [enr] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, parsed.data.studentUserId),
          eq(enrollments.programId, parsed.data.programId),
        ),
      )
      .limit(1);
    if (!enr) {
      await db.insert(enrollments).values({
        fullName: u.fullName ?? u.email,
        email: u.email,
        programId: parsed.data.programId,
        status: "assigned",
        userId: parsed.data.studentUserId,
      });
    }
  }

  revalidatePath("/admin/students");
  return { success: true as const };
}
