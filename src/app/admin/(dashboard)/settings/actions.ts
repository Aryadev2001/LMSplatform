"use server";

import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { users, tenants, tierRewards, programs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireTenantId } from "@/lib/tenant";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireRole, getCurrentUser, CANONICAL_ADMIN } from "@/lib/auth";
import { ADMIN_PERMISSIONS, type AdminPermission } from "@/lib/permissions";
import { recordAudit } from "@/lib/audit";
import { encryptSecret, encryptionAvailable } from "@/lib/crypto";

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
  const tenantId = await requireTenantId();

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
        tenantId,
      });
    } else {
      await db
        .update(users)
        .set({
          role: CANONICAL_ADMIN,
          isSuperAdmin: false,
          permissions,
          tenantId,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkId, clerkUser.id));
    }
  } else {
    // Invite new admin
    try {
      await clerk.invitations.createInvitation({
        emailAddress: email,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/accept-invite`,
        publicMetadata: {
          role: CANONICAL_ADMIN,
          invitedPermissions: permissions,
          tenantId,
        },
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
  const tenantId = await requireTenantId();

  const parsed = PermsSchema.safeParse(permissions);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid permissions" };
  }

  const [target] = await db
    .select({ isSuperAdmin: users.isSuperAdmin, tenantId: users.tenantId })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);
  if (!target || target.tenantId !== tenantId) {
    return { success: false as const, error: "Admin not found in your workspace." };
  }
  if (target.isSuperAdmin) {
    return { success: false as const, error: "Super admin permissions can't be changed." };
  }

  await db
    .update(users)
    .set({ permissions: parsed.data, updatedAt: new Date() })
    .where(and(eq(users.id, targetUserId), eq(users.tenantId, tenantId)));
  revalidatePath("/admin/settings");
  return { success: true as const };
}

export async function removeAdmin(targetUserId: string) {
  const gate = await requireManageAdmins();
  if (!gate.ok) return { success: false as const, error: gate.error };
  const tenantId = await requireTenantId();

  const me = await getCurrentUser();
  const [target] = await db
    .select({
      clerkId: users.clerkId,
      isSuperAdmin: users.isSuperAdmin,
      tenantId: users.tenantId,
    })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  if (!target || target.tenantId !== tenantId) {
    return { success: false as const, error: "Admin not found in your workspace." };
  }
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
  await db
    .delete(users)
    .where(and(eq(users.id, targetUserId), eq(users.tenantId, tenantId)));

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
  // Branding changes show in the storefront immediately rather than
  // up to 60s later.
  revalidateTag("tenant", "default");
  revalidateTag("marketplace", "default");
  return { success: true };
}

/**
 * Toggle the tenant's hide_platform_logo flag — the active white-label
 * switch. The route is feature-gated server-side so a Basic/Standard tenant
 * with no override can't turn it on by calling this directly.
 */
export async function setWhiteLabelActive(
  enabled: boolean,
): Promise<{ success: true } | { success: false; error: string }> {
  const me = await requireRole("admin");
  if (!me.tenantId) {
    return { success: false, error: "Your account is not attached to a tenant." };
  }
  const { hasFeature } = await import("@/lib/tier-lock");
  if (enabled && !(await hasFeature("white_label"))) {
    return {
      success: false,
      error:
        "White-label is a Premium feature. Upgrade your partner plan to enable it.",
    };
  }
  await db
    .update(tenants)
    .set({ hidePlatformLogo: enabled, updatedAt: new Date() })
    .where(eq(tenants.id, me.tenantId));
  await recordAudit({
    action: "tenant.white_label.toggle",
    targetType: "tenant",
    targetId: me.tenantId,
    metadata: { enabled },
  });
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  revalidateTag("tenant", "default");
  return { success: true };
}

const TierRewardSchema = z.object({
  tier: z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM"]),
  courseId: z.string().uuid().nullable(),
});

/**
 * Tenant-admin maps a referral tier → one reward course (or clears it).
 * Tenant scope derived from the SESSION; the course must belong to the same
 * tenant (no cross-tenant reward wiring). Audited.
 */
export async function setTierReward(
  input: unknown,
): Promise<{ success: true } | { success: false; error: string }> {
  const me = await requireRole("admin");
  if (!me.tenantId) {
    return { success: false, error: "Your account is not attached to a tenant." };
  }
  const parsed = TierRewardSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { tier, courseId } = parsed.data;

  if (courseId) {
    const [course] = await db
      .select({ id: programs.id, tenantId: programs.tenantId })
      .from(programs)
      .where(eq(programs.id, courseId))
      .limit(1);
    if (!course || course.tenantId !== me.tenantId) {
      return { success: false, error: "That course is not in your catalog." };
    }
  }

  // Replace the mapping for this tenant+tier (one reward course per tier).
  await db
    .delete(tierRewards)
    .where(and(eq(tierRewards.tenantId, me.tenantId), eq(tierRewards.tier, tier)));

  if (courseId) {
    await db.insert(tierRewards).values({
      tenantId: me.tenantId,
      tier,
      courseId,
    });
  }

  await recordAudit({
    action: "tier_reward.set",
    targetType: "tenant",
    targetId: me.tenantId,
    metadata: { tier, courseId },
  });

  revalidatePath("/admin/settings");
  return { success: true };
}

const RazorpaySchema = z.object({
  keyId: z
    .string()
    .trim()
    .regex(/^rzp_(test|live)_[A-Za-z0-9]+$/, "Key ID looks like rzp_live_xxxxxxxx"),
  keySecret: z.string().trim().min(10, "Enter your Razorpay key secret").max(256),
});

/**
 * A tenant connects THEIR OWN Razorpay so student payments go directly to
 * them. Tenant scope from the session (never the client). The secret is
 * encrypted at rest (AES-256-GCM); we never store or echo it in plaintext.
 * Super-admin only supervises connection status — it can't read the secret.
 */
export async function connectRazorpay(
  input: unknown,
): Promise<{ success: true } | { success: false; error: string }> {
  const me = await requireRole("admin");
  if (!me.tenantId) {
    return { success: false, error: "Your account is not attached to a tenant." };
  }
  if (!encryptionAvailable()) {
    return {
      success: false,
      error:
        "Secret encryption is not configured on the server — set APP_ENCRYPTION_KEY (or CLERK_SECRET_KEY). Keys were NOT saved.",
    };
  }
  const parsed = RazorpaySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let encrypted: string;
  try {
    encrypted = encryptSecret(parsed.data.keySecret);
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Could not encrypt the secret.",
    };
  }

  await db
    .update(tenants)
    .set({
      razorpayKeyId: parsed.data.keyId,
      razorpayKeySecret: encrypted,
      paymentProvider: "razorpay",
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, me.tenantId));

  await recordAudit({
    action: "payment_gateway.connect",
    targetType: "tenant",
    targetId: me.tenantId,
    metadata: { provider: "razorpay", keyId: parsed.data.keyId },
  });

  revalidatePath("/admin/settings");
  return { success: true };
}

export async function disconnectRazorpay(): Promise<
  { success: true } | { success: false; error: string }
> {
  const me = await requireRole("admin");
  if (!me.tenantId) {
    return { success: false, error: "Your account is not attached to a tenant." };
  }
  const [cur] = await db
    .select({ provider: tenants.paymentProvider })
    .from(tenants)
    .where(eq(tenants.id, me.tenantId))
    .limit(1);
  await db
    .update(tenants)
    .set({
      razorpayKeyId: null,
      razorpayKeySecret: null,
      // Only clear the active provider if it was Razorpay.
      ...(cur?.provider === "razorpay" ? { paymentProvider: null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, me.tenantId));

  await recordAudit({
    action: "payment_gateway.disconnect",
    targetType: "tenant",
    targetId: me.tenantId,
    metadata: { provider: "razorpay" },
  });

  revalidatePath("/admin/settings");
  return { success: true };
}

const StripeSchema = z.object({
  publishableKey: z
    .string()
    .trim()
    .regex(/^pk_(test|live)_[A-Za-z0-9]+$/, "Publishable key looks like pk_live_xxxx"),
  secretKey: z
    .string()
    .trim()
    .regex(/^sk_(test|live)_[A-Za-z0-9]+$/, "Secret key looks like sk_live_xxxx")
    .max(256),
});

/**
 * A tenant connects THEIR OWN Stripe. Same posture as Razorpay: session
 * tenant-scoped, secret key encrypted at rest, publishable key is not secret
 * (stored plaintext), super-admin only sees connection status.
 */
export async function connectStripe(
  input: unknown,
): Promise<{ success: true } | { success: false; error: string }> {
  const me = await requireRole("admin");
  if (!me.tenantId) {
    return { success: false, error: "Your account is not attached to a tenant." };
  }
  if (!encryptionAvailable()) {
    return {
      success: false,
      error:
        "Secret encryption is not configured on the server — set APP_ENCRYPTION_KEY (or CLERK_SECRET_KEY). Keys were NOT saved.",
    };
  }
  const parsed = StripeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let encrypted: string;
  try {
    encrypted = encryptSecret(parsed.data.secretKey);
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Could not encrypt the secret.",
    };
  }

  await db
    .update(tenants)
    .set({
      stripePublishableKey: parsed.data.publishableKey,
      stripeSecretKey: encrypted,
      paymentProvider: "stripe",
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, me.tenantId));

  await recordAudit({
    action: "payment_gateway.connect",
    targetType: "tenant",
    targetId: me.tenantId,
    metadata: { provider: "stripe", publishableKey: parsed.data.publishableKey },
  });

  revalidatePath("/admin/settings");
  return { success: true };
}

export async function disconnectStripe(): Promise<
  { success: true } | { success: false; error: string }
> {
  const me = await requireRole("admin");
  if (!me.tenantId) {
    return { success: false, error: "Your account is not attached to a tenant." };
  }
  const [cur] = await db
    .select({ provider: tenants.paymentProvider })
    .from(tenants)
    .where(eq(tenants.id, me.tenantId))
    .limit(1);
  await db
    .update(tenants)
    .set({
      stripePublishableKey: null,
      stripeSecretKey: null,
      ...(cur?.provider === "stripe" ? { paymentProvider: null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, me.tenantId));

  await recordAudit({
    action: "payment_gateway.disconnect",
    targetType: "tenant",
    targetId: me.tenantId,
    metadata: { provider: "stripe" },
  });

  revalidatePath("/admin/settings");
  return { success: true };
}

const WebhookSecretSchema = z.object({
  provider: z.enum(["stripe", "razorpay"]),
  // Empty string clears the secret (disables that provider's webhooks).
  secret: z.string().trim().max(256),
});

/**
 * Store the tenant's webhook signing secret for a provider, encrypted at
 * rest (same posture as the gateway keys). Webhooks are optional hardening
 * on top of return-verification; an empty value clears it. Tenant scope is
 * from the session — never the client.
 */
export async function saveWebhookSecret(
  input: unknown,
): Promise<{ success: true } | { success: false; error: string }> {
  const me = await requireRole("admin");
  if (!me.tenantId) {
    return { success: false, error: "Your account is not attached to a tenant." };
  }
  const parsed = WebhookSecretSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { provider, secret } = parsed.data;

  let value: string | null = null;
  if (secret.length > 0) {
    if (secret.length < 6) {
      return { success: false, error: "That secret looks too short." };
    }
    if (!encryptionAvailable()) {
      return {
        success: false,
        error:
          "Secret encryption is not configured on the server — the webhook secret was NOT saved.",
      };
    }
    try {
      value = encryptSecret(secret);
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Could not encrypt the secret.",
      };
    }
  }

  await db
    .update(tenants)
    .set({
      ...(provider === "stripe"
        ? { stripeWebhookSecret: value }
        : { razorpayWebhookSecret: value }),
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, me.tenantId));

  await recordAudit({
    action: value ? "payment_webhook.configure" : "payment_webhook.clear",
    targetType: "tenant",
    targetId: me.tenantId,
    metadata: { provider },
  });

  revalidatePath("/admin/settings");
  return { success: true };
}
