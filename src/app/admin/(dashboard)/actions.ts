"use server";

import { z } from "zod";
import { db } from "@/db/client";
import { programs, students, users, tenants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole, isStudentRole } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
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
const ProgramSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  priceCents: z.number().int().min(0),
  currency: z.string().length(3).default("USD"),
  durationMonths: z.number().int().min(1).max(60),
  isActive: z.boolean().default(true),
  imageUrl: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type ProgramResult = { success: true; id: string } | { success: false; error: string };

/** Creator-tier tenants (self-serve signups) can only publish FREE courses;
 *  paid courses require the invite-only partner program. */
async function assertPriceAllowed(
  tenantId: string,
  priceCents: number,
): Promise<ProgramResult | null> {
  if (priceCents === 0) return null;
  const [t] = await db
    .select({ creatorOnly: tenants.creatorOnly })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  if (t?.creatorOnly) {
    return {
      success: false,
      error:
        "Paid courses require the partner program — apply at /contact. Your creator tier supports free courses only.",
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
      tenantId,
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

  revalidatePath("/admin/students");
  return { success: true as const };
}
