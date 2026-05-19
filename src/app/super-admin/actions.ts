"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { tenants, users, programs } from "@/db/schema";
import {
  promoteToMaster,
  pushMasterToTenant,
  syncMasterToAllTenants,
  createMasterCourse as authorMasterCourse,
} from "@/lib/course-push";
import { requireSuper, type SuperRole, CANONICAL_ADMIN } from "@/lib/auth";
import { canWrite, canManageTeam } from "@/lib/super";
import { recordAudit } from "@/lib/audit";
import { IMPERSONATION_COOKIE } from "@/lib/impersonation";
import { RESERVED_SUBDOMAINS } from "@/lib/tenant";

type Result = { success: true } | { success: false; error: string };

const HEX = /^#[0-9a-fA-F]{6}$/;

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Slug must be at least 2 characters")
  .max(63, "Slug must be at most 63 characters")
  .regex(
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/,
    "Lowercase letters, numbers and hyphens only; cannot start/end with a hyphen",
  )
  .refine((s) => !RESERVED_SUBDOMAINS.has(s), "That subdomain is reserved");

const CreateTenantSchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: slugSchema,
  adminEmail: z.string().trim().toLowerCase().email("Enter a valid admin email"),
  adminName: z.string().trim().max(200).optional().or(z.literal("")),
  brandPrimaryColor: z.string().regex(HEX).optional(),
  brandSecondaryColor: z.string().regex(HEX).optional(),
  heroTagline: z.string().trim().max(240).optional().or(z.literal("")),
});

/**
 * Provision the tenant's first admin. Existing Clerk user → promote + sync
 * the DB row immediately (can sign in now). New email → Clerk magic-link
 * invitation carrying { role, tenantId } so the webhook scopes them on
 * accept. Returns whether an email invite was sent.
 */
async function provisionTenantAdmin(
  email: string,
  fullName: string | null,
  tenantId: string,
): Promise<{ invited: boolean }> {
  const clerk = await clerkClient();
  const existing = await clerk.users.getUserList({ emailAddress: [email] });
  const clerkUser = existing.data[0];

  if (clerkUser) {
    await clerk.users.updateUserMetadata(clerkUser.id, {
      publicMetadata: {
        ...(clerkUser.publicMetadata ?? {}),
        role: CANONICAL_ADMIN,
        tenantId,
      },
    });
    const [dbRow] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, clerkUser.id))
      .limit(1);
    if (!dbRow) {
      await db.insert(users).values({
        clerkId: clerkUser.id,
        email,
        fullName: fullName || "Tenant Admin",
        role: CANONICAL_ADMIN,
        isSuperAdmin: false,
        tenantId,
      });
    } else {
      await db
        .update(users)
        .set({
          role: CANONICAL_ADMIN,
          isSuperAdmin: false,
          tenantId,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkId, clerkUser.id));
    }
    return { invited: false };
  }

  await clerk.invitations.createInvitation({
    emailAddress: email,
    redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/accept-invite`,
    publicMetadata: { role: CANONICAL_ADMIN, tenantId },
    notify: true,
  });
  return { invited: true };
}

const UpdateTenantSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().trim().min(2).max(200),
  status: z.enum(["ACTIVE", "SUSPENDED", "TRIAL", "CHURNED"]),
  brandPrimaryColor: z.string().regex(HEX),
  brandSecondaryColor: z.string().regex(HEX),
  heroTagline: z.string().trim().max(240).optional().or(z.literal("")),
  referralEnabled: z.boolean(),
  referralPointsPercent: z.coerce.number().min(0).max(100),
  referralRedeemMaxPercent: z.coerce.number().min(0).max(100),
  platformFeePercent: z.coerce.number().min(0).max(50),
});

const InviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  fullName: z.string().trim().max(200).optional().or(z.literal("")),
  superRole: z.enum(["SUPER_OWNER", "SUPER_STAFF", "SUPER_SUPPORT"]),
});

type CreateTenantResult =
  | { success: true; invited: boolean; adminEmail: string }
  | { success: false; error: string };

export async function createTenant(input: unknown): Promise<CreateTenantResult> {
  const me = await requireSuper(); // any super may reach here…
  if (!canWrite(me.rawRole as SuperRole)) {
    return { success: false, error: "Read-only role — you cannot create tenants." };
  }
  const parsed = CreateTenantSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const clash = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, data.slug))
    .limit(1);
  if (clash.length > 0) {
    return { success: false, error: `Slug "${data.slug}" is already taken.` };
  }

  const [row] = await db
    .insert(tenants)
    .values({
      name: data.name,
      slug: data.slug,
      ...(data.brandPrimaryColor ? { brandPrimaryColor: data.brandPrimaryColor } : {}),
      ...(data.brandSecondaryColor ? { brandSecondaryColor: data.brandSecondaryColor } : {}),
      heroTagline: data.heroTagline || null,
    })
    .returning({ id: tenants.id });

  const audited = await recordAudit({
    action: "tenant.create",
    targetType: "tenant",
    targetId: row.id,
    metadata: { slug: data.slug, name: data.name },
  });
  if (!audited) {
    // Don't leave an unaudited super write — roll the row back.
    await db.delete(tenants).where(eq(tenants.id, row.id));
    return { success: false, error: "Could not record audit entry — tenant not created." };
  }

  // Provision the tenant's first admin so they get dashboard access by email.
  let invited = false;
  try {
    const r = await provisionTenantAdmin(
      data.adminEmail,
      data.adminName || null,
      row.id,
    );
    invited = r.invited;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // A pending invite / already-member for this email is fine — the access
    // email is (or was) on its way. Any other failure → atomic rollback so
    // the super can fix the email and retry cleanly.
    if (!/already|exists|duplicate/i.test(msg)) {
      await db.delete(tenants).where(eq(tenants.id, row.id));
      return {
        success: false,
        error: `Tenant not created — could not invite ${data.adminEmail}: ${msg}`,
      };
    }
    invited = true;
  }

  await recordAudit({
    action: "tenant.admin_invited",
    targetType: "tenant",
    targetId: row.id,
    metadata: { adminEmail: data.adminEmail, invited },
  });

  revalidatePath("/super-admin/tenants");
  return { success: true, invited, adminEmail: data.adminEmail };
}

export async function updateTenant(input: unknown): Promise<Result> {
  const me = await requireSuper();
  if (!canWrite(me.rawRole as SuperRole)) {
    return { success: false, error: "Read-only role — you cannot edit tenants." };
  }
  const parsed = UpdateTenantSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const exists = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.id, d.tenantId))
    .limit(1);
  if (exists.length === 0) {
    return { success: false, error: "Tenant not found." };
  }

  await db
    .update(tenants)
    .set({
      name: d.name,
      status: d.status,
      brandPrimaryColor: d.brandPrimaryColor,
      brandSecondaryColor: d.brandSecondaryColor,
      heroTagline: d.heroTagline || null,
      referralEnabled: d.referralEnabled,
      referralPointsPercent: d.referralPointsPercent,
      referralRedeemMaxPercent: d.referralRedeemMaxPercent,
      platformFeeBps: Math.round(d.platformFeePercent * 100),
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, d.tenantId));

  await recordAudit({
    action: "tenant.update",
    targetType: "tenant",
    targetId: d.tenantId,
    metadata: {
      name: d.name,
      status: d.status,
      platformFeeBps: Math.round(d.platformFeePercent * 100),
    },
  });

  revalidatePath(`/super-admin/tenants/${d.tenantId}`);
  revalidatePath("/super-admin/tenants");
  return { success: true };
}

export async function inviteSuperMember(input: unknown): Promise<Result> {
  const me = await requireSuper();
  if (!canManageTeam(me.rawRole as SuperRole)) {
    return { success: false, error: "Only the Owner can manage the super-admin team." };
  }
  const parsed = InviteMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { email, fullName, superRole } = parsed.data;

  const clerk = await clerkClient();
  const existing = await clerk.users.getUserList({ emailAddress: [email] });
  const clerkUser = existing.data[0];

  if (clerkUser) {
    await clerk.users.updateUserMetadata(clerkUser.id, {
      publicMetadata: { ...(clerkUser.publicMetadata ?? {}), role: superRole },
    });
    const dbRow = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, clerkUser.id))
      .limit(1);
    if (dbRow.length === 0) {
      await db.insert(users).values({
        clerkId: clerkUser.id,
        email,
        fullName: fullName || "EDT Team",
        role: superRole,
        isSuperAdmin: true,
        tenantId: null,
      });
    } else {
      await db
        .update(users)
        .set({ role: superRole, isSuperAdmin: true, tenantId: null, updatedAt: new Date() })
        .where(eq(users.clerkId, clerkUser.id));
    }
  } else {
    try {
      await clerk.invitations.createInvitation({
        emailAddress: email,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/accept-invite`,
        publicMetadata: { role: superRole },
        notify: true,
      });
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to send invitation",
      };
    }
  }

  await recordAudit({
    action: "super_team.invite",
    targetType: "user",
    targetId: email,
    metadata: { superRole, existed: !!clerkUser },
  });

  revalidatePath("/super-admin/team");
  return { success: true };
}

async function actorUserId(clerkId: string): Promise<string | null> {
  const [a] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  return a?.id ?? null;
}

const CreateMasterSchema = z.object({
  name: z.string().trim().min(3).max(200),
  tagline: z.string().trim().max(240).optional().or(z.literal("")),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  priceRupees: z.coerce.number().int().min(0).max(10_000_000),
  durationMonths: z.coerce.number().int().min(1).max(60),
  tier: z.enum(["low", "mid", "high"]),
  type: z.enum(["one_time", "subscription"]),
});

export async function createMasterCourse(input: unknown): Promise<Result> {
  const me = await requireSuper();
  if (!canWrite(me.rawRole as SuperRole)) {
    return { success: false, error: "Read-only role — you cannot create master courses." };
  }
  const parsed = CreateMasterSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  try {
    const masterId = await authorMasterCourse({
      name: d.name,
      tagline: d.tagline || null,
      description: d.description || null,
      priceCents: d.priceRupees * 100,
      durationMonths: d.durationMonths,
      tier: d.tier,
      type: d.type,
    });
    await recordAudit({
      action: "course.create_master",
      targetType: "program",
      targetId: masterId,
      metadata: { name: d.name },
    });
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Create failed" };
  }

  revalidatePath("/super-admin/courses");
  return { success: true };
}

export async function promoteCourseToMaster(input: unknown): Promise<Result> {
  const me = await requireSuper();
  if (!canWrite(me.rawRole as SuperRole)) {
    return { success: false, error: "Read-only role — you cannot create master courses." };
  }
  const parsed = z.object({ courseId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  try {
    const masterId = await promoteToMaster(parsed.data.courseId);
    await recordAudit({
      action: "course.promote_master",
      targetType: "program",
      targetId: masterId,
      metadata: { sourceCourseId: parsed.data.courseId },
    });
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Promote failed" };
  }

  revalidatePath("/super-admin/courses");
  return { success: true };
}

export async function pushMasterCourse(input: unknown): Promise<Result> {
  const me = await requireSuper();
  if (!canWrite(me.rawRole as SuperRole)) {
    return { success: false, error: "Read-only role — you cannot push courses." };
  }
  const parsed = z
    .object({ masterId: z.string().uuid(), tenantIds: z.array(z.string().uuid()).min(1) })
    .safeParse(input);
  if (!parsed.success) return { success: false, error: "Pick at least one tenant." };

  const actor = await actorUserId(me.userId);
  try {
    for (const tenantId of parsed.data.tenantIds) {
      await pushMasterToTenant({
        masterId: parsed.data.masterId,
        tenantId,
        pushedByUserId: actor,
      });
    }
    await recordAudit({
      action: "course.push",
      targetType: "program",
      targetId: parsed.data.masterId,
      metadata: { tenantIds: parsed.data.tenantIds },
    });
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Push failed" };
  }

  revalidatePath("/super-admin/courses");
  return { success: true };
}

export async function syncMasterCourse(input: unknown): Promise<Result> {
  const me = await requireSuper();
  if (!canWrite(me.rawRole as SuperRole)) {
    return { success: false, error: "Read-only role — you cannot sync courses." };
  }
  const parsed = z.object({ masterId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const actor = await actorUserId(me.userId);
  try {
    const { tenants: n } = await syncMasterToAllTenants({
      masterId: parsed.data.masterId,
      pushedByUserId: actor,
    });
    await recordAudit({
      action: "course.sync",
      targetType: "program",
      targetId: parsed.data.masterId,
      metadata: { tenantsSynced: n },
    });
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Sync failed" };
  }

  revalidatePath("/super-admin/courses");
  return { success: true };
}

/**
 * Super-admin "open dashboard as this tenant". Sets the impersonation
 * cookie (re-verified as super on every request) and audits it. Full
 * access — actions taken while impersonating still flow through the
 * normal per-request audit log; start/stop is explicitly recorded.
 */
export async function impersonateTenant(input: unknown): Promise<Result> {
  const me = await requireSuper();
  if (!canWrite(me.rawRole as SuperRole)) {
    return { success: false, error: "Read-only role — you cannot open tenant accounts." };
  }
  const parsed = z.object({ tenantId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid tenant." };

  const [t] = await db
    .select({ id: tenants.id, name: tenants.name })
    .from(tenants)
    .where(eq(tenants.id, parsed.data.tenantId))
    .limit(1);
  if (!t) return { success: false, error: "Tenant not found." };

  const jar = await cookies();
  jar.set(IMPERSONATION_COOKIE, t.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  await recordAudit({
    action: "tenant.impersonate.start",
    targetType: "tenant",
    targetId: t.id,
    metadata: { name: t.name },
  });

  redirect("/admin");
}

/** Exit impersonation and return to the super-admin console. Audited. */
export async function stopImpersonation(): Promise<Result> {
  const me = await requireSuper();
  const jar = await cookies();
  const current = jar.get(IMPERSONATION_COOKIE)?.value ?? null;
  jar.delete(IMPERSONATION_COOKIE);

  await recordAudit({
    action: "tenant.impersonate.stop",
    targetType: "tenant",
    targetId: current ?? "unknown",
    metadata: { by: me.rawRole },
  });

  redirect("/super-admin/tenants");
}
