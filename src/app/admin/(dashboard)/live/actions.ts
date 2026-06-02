"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { liveSessions, programs } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";

const Schema = z.object({
  title: z.string().trim().min(2, "Add a title").max(240),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  startsAt: z.string().min(1, "Pick a date & time"),
  durationMinutes: z.coerce.number().int().min(5).max(600),
  joinUrl: z.string().trim().url("Enter a valid meeting link (https://…)").max(2048),
  programId: z.string().uuid().nullable().optional(),
});

export type LiveResult = { success: true } | { success: false; error: string };

export async function createLiveSession(input: unknown): Promise<LiveResult> {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  const parsed = Schema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const startsAt = new Date(d.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return { success: false, error: "That date & time isn't valid." };
  }

  // A program, if set, must belong to this tenant (no cross-tenant linking).
  if (d.programId) {
    const [p] = await db
      .select({ id: programs.id })
      .from(programs)
      .where(and(eq(programs.id, d.programId), eq(programs.tenantId, tenantId)))
      .limit(1);
    if (!p) return { success: false, error: "That course isn't in your catalog." };
  }

  await db.insert(liveSessions).values({
    tenantId,
    programId: d.programId || null,
    title: d.title,
    description: d.description || null,
    startsAt,
    durationMinutes: d.durationMinutes,
    joinUrl: d.joinUrl,
  });

  revalidatePath("/admin/live");
  return { success: true };
}

export async function deleteLiveSession(id: string): Promise<LiveResult> {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  await db
    .delete(liveSessions)
    .where(and(eq(liveSessions.id, id), eq(liveSessions.tenantId, tenantId)));
  revalidatePath("/admin/live");
  return { success: true };
}
