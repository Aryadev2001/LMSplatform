"use server";

import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/db/client";
import { bundles, bundleItems, programs } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { hasFeature } from "@/lib/tier-lock";

function makeBundleSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return `${base || "bundle"}-${Math.random().toString(36).slice(2, 7)}`;
}

const BundleSchema = z.object({
  name: z.string().trim().min(2, "Add a name").max(240),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  priceCents: z.coerce.number().int().min(0),
  currency: z.string().trim().length(3).default("INR"),
  imageUrl: z.string().trim().url().max(2048).optional().or(z.literal("")),
  programIds: z.array(z.string().uuid()).min(2, "Pick at least 2 courses").max(50),
  isActive: z.boolean().default(true),
});

export type BundleResult = { success: true } | { success: false; error: string };

export async function createBundle(input: unknown): Promise<BundleResult> {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  const parsed = BundleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  // Charging for a bundle requires the paid_courses feature (Standard+),
  // same gate as paid courses. Free bundles are allowed on Basic.
  if (d.priceCents > 0 && !(await hasFeature("paid_courses"))) {
    return {
      success: false,
      error:
        "Selling a paid bundle requires the Standard plan. Upgrade in Billing, or set the price to 0.",
    };
  }

  // Every course must belong to this tenant.
  const owned = await db
    .select({ id: programs.id })
    .from(programs)
    .where(and(eq(programs.tenantId, tenantId), inArray(programs.id, d.programIds)));
  if (owned.length !== d.programIds.length) {
    return { success: false, error: "All courses in a bundle must be your own." };
  }

  const [row] = await db
    .insert(bundles)
    .values({
      tenantId,
      slug: makeBundleSlug(d.name),
      name: d.name,
      description: d.description || null,
      priceCents: d.priceCents,
      currency: d.currency.toUpperCase(),
      imageUrl: d.imageUrl || null,
      isActive: d.isActive,
    })
    .returning({ id: bundles.id });

  await db.insert(bundleItems).values(
    d.programIds.map((programId) => ({ bundleId: row.id, programId })),
  );

  revalidatePath("/admin/bundles");
  revalidateTag("marketplace", "default");
  return { success: true };
}

export async function setBundleActive(id: string, active: boolean): Promise<BundleResult> {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  await db
    .update(bundles)
    .set({ isActive: active, updatedAt: new Date() })
    .where(and(eq(bundles.id, id), eq(bundles.tenantId, tenantId)));
  revalidatePath("/admin/bundles");
  revalidateTag("marketplace", "default");
  return { success: true };
}

export async function deleteBundle(id: string): Promise<BundleResult> {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  await db.delete(bundles).where(and(eq(bundles.id, id), eq(bundles.tenantId, tenantId)));
  revalidatePath("/admin/bundles");
  revalidateTag("marketplace", "default");
  return { success: true };
}
