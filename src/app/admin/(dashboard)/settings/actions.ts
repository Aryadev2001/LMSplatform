"use server";

import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { users, tenants, domainRequests } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { getRootDomain } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { requireRole, getCurrentUser, CANONICAL_ADMIN } from "@/lib/auth";
import { ADMIN_PERMISSIONS, type AdminPermission } from "@/lib/permissions";
import { recordAudit } from "@/lib/audit";

async function requireManageAdmins() {
  const me = await requireRole("admin");
  const [row] = await db
    .select({ isSuperAdmin: users.isSuperAdmin, permissions: users.permissions })
    .from(users)
    .where(eq(users.clerkId, me.userId))
    .limit(1);
  const canManage =
    row?.isSuperAdmin || (row?.permissions ?? []).includes("manage_admins");
  if (!canManage) {
    return { ok: false as const, error: "You don't have permission to manage admins." };
  }
  return { ok: true as const, me };
}

const PermsSchema = z.array(z.enum(ADMIN_PERMISSIONS));

const AddAdminSchema = z.object({
  email: z.email("Enter a valid email"),
  fullName: z.string().max(200).optional().or(z.literal("")),
  permissions: PermsSchema,
});

export type AddAdminResult = { success: true; email: string } | { success: false; error: string };

export async function addAdmin(input: z.infer<typeof AddAdminSchema>): Promise<AddAdminResult> {
  const gate = await requireManageAdmins();
  if (!gate.ok) return { success: false, error: gate.error };

  const parsed = AddAdminSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { email, fullName, permissions } = parsed.data;

  const clerk = await clerkClient();
  const existing = await clerk.users.getUserList({ emailAddress: [email] });
  const clerkUser = existing.data[0];

  if (clerkUser) {
    // Promote existing user
    await clerk.users.updateUserMetadata(clerkUser.id, {
      publicMetadata: { ...(clerkUser.publicMetadata ?? {}), role: CANONICAL_ADMIN },
    });
    const dbRow = await db.select().from(users).where(eq(users.clerkId, clerkUser.id)).limit(1);
    if (dbRow.length === 0) {
      await db.insert(users).values({
        clerkId: clerkUser.id,
        email,
        fullName: fullName || null,
        role: CANONICAL_ADMIN,
        isSuperAdmin: false,
        permissions,
      });
    } else {
      await db
        .update(users)
        .set({ role: CANONICAL_ADMIN, isSuperAdmin: false, permissions, updatedAt: new Date() })
        .where(eq(users.clerkId, clerkUser.id));
    }
  } else {
    // Invite new admin
    try {
      await clerk.invitations.createInvitation({
        emailAddress: email,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/admin`,
        publicMetadata: { role: CANONICAL_ADMIN, invitedPermissions: permissions },
        notify: true,
      });
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to send invitation",
      };
    }
  }

  revalidatePath("/admin/settings");
  return { success: true, email };
}

export async function updateAdminPermissions(
  targetUserId: string,
  permissions: AdminPermission[],
) {
  const gate = await requireManageAdmins();
  if (!gate.ok) return { success: false as const, error: gate.error };

  const parsed = PermsSchema.safeParse(permissions);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid permissions" };
  }

  const [target] = await db
    .select({ isSuperAdmin: users.isSuperAdmin })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);
  if (target?.isSuperAdmin) {
    return { success: false as const, error: "Super admin permissions can't be changed." };
  }

  await db
    .update(users)
    .set({ permissions: parsed.data, updatedAt: new Date() })
    .where(eq(users.id, targetUserId));
  revalidatePath("/admin/settings");
  return { success: true as const };
}

export async function removeAdmin(targetUserId: string) {
  const gate = await requireManageAdmins();
  if (!gate.ok) return { success: false as const, error: gate.error };

  const me = await getCurrentUser();
  const [target] = await db
    .select({ clerkId: users.clerkId, isSuperAdmin: users.isSuperAdmin })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  if (!target) return { success: false as const, error: "Admin not found" };
  if (target.isSuperAdmin) {
    return { success: false as const, error: "The super admin can't be removed." };
  }
  if (me && target.clerkId === me.userId) {
    return { success: false as const, error: "You can't remove yourself." };
  }

  // Demote: remove admin role in Clerk + delete our DB row
  const clerk = await clerkClient();
  try {
    await clerk.users.updateUserMetadata(target.clerkId, {
      publicMetadata: { role: null },
    });
  } catch {
    /* ignore — Clerk user may already be gone */
  }
  await db.delete(users).where(eq(users.id, targetUserId));

  revalidatePath("/admin/settings");
  return { success: true as const };
}

const HEX = /^#[0-9a-fA-F]{6}$/;

const BrandingSchema = z.object({
  logoUrl: z.string().url().max(2048).optional().or(z.literal("")),
  brandPrimaryColor: z.string().regex(HEX, "Use a #rrggbb hex color"),
  brandSecondaryColor: z.string().regex(HEX, "Use a #rrggbb hex color"),
  heroTagline: z.string().trim().max(240).optional().or(z.literal("")),
});

/**
 * Tenant-admin updates THEIR OWN tenant's whitelabel. The tenant scope is
 * derived from the session — never from the client — so a tenant admin can
 * never write another tenant's branding (acceptance #5).
 */
export async function updateMyTenantBranding(
  input: unknown,
): Promise<{ success: true } | { success: false; error: string }> {
  const me = await requireRole("admin");
  if (!me.tenantId) {
    return { success: false, error: "Your account is not attached to a tenant." };
  }
  const parsed = BrandingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  await db
    .update(tenants)
    .set({
      logoUrl: d.logoUrl ? d.logoUrl : null,
      brandPrimaryColor: d.brandPrimaryColor,
      brandSecondaryColor: d.brandSecondaryColor,
      heroTagline: d.heroTagline ? d.heroTagline : null,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, me.tenantId));

  await recordAudit({
    action: "tenant.branding.update",
    targetType: "tenant",
    targetId: me.tenantId,
    metadata: {
      brandPrimaryColor: d.brandPrimaryColor,
      brandSecondaryColor: d.brandSecondaryColor,
      hasLogo: !!d.logoUrl,
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { success: true };
}

const FQDN =
  /^(?=.{4,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

const DomainRequestSchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .max(253)
    .regex(FQDN, "Enter a valid domain like learn.yourbrand.com"),
});

/**
 * Tenant-admin requests a custom domain for THEIR OWN tenant (tenant derived
 * from the session, never the client). Queues a domain_requests row + flips
 * the tenant to REQUESTED. Resolution stays off until a super-admin manually
 * adds it in Vercel and marks it configured (P7-5 manual DNS workflow).
 */
export async function requestCustomDomain(
  input: unknown,
): Promise<{ success: true } | { success: false; error: string }> {
  const me = await requireRole("admin");
  if (!me.tenantId) {
    return { success: false, error: "Your account is not attached to a tenant." };
  }
  const parsed = DomainRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const domain = parsed.data.domain;

  // Must be an external domain, not the platform root or a subdomain of it.
  const root = getRootDomain();
  if (root && (domain === root || domain.endsWith(`.${root}`))) {
    return {
      success: false,
      error: `Use your subdomain on ${root} instead — custom domains are for your own external domain.`,
    };
  }

  // Domain must be globally unique across tenants.
  const taken = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(and(eq(tenants.customDomain, domain), ne(tenants.id, me.tenantId)))
    .limit(1);
  if (taken.length > 0) {
    return { success: false, error: "That domain is already claimed by another tenant." };
  }

  await db.insert(domainRequests).values({
    tenantId: me.tenantId,
    domain,
    status: "PENDING",
  });

  await db
    .update(tenants)
    .set({ customDomain: domain, customDomainStatus: "REQUESTED", updatedAt: new Date() })
    .where(eq(tenants.id, me.tenantId));

  await recordAudit({
    action: "domain.request",
    targetType: "tenant",
    targetId: me.tenantId,
    metadata: { domain },
  });

  revalidatePath("/admin/settings");
  return { success: true };
}
