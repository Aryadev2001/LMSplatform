"use server";

import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { tenants, users, programs } from "@/db/schema";
import { CANONICAL_ADMIN } from "@/lib/auth";
import { RESERVED_SUBDOMAINS } from "@/lib/tenant";

const HEX = /^#[0-9a-fA-F]{6}$/;

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(63)
  .regex(
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/,
    "Lowercase letters, numbers and hyphens only",
  )
  .refine((s) => !RESERVED_SUBDOMAINS.has(s), "That subdomain is reserved");

/** Real-time subdomain availability for the branding step. */
export async function checkSubdomain(
  raw: string,
): Promise<{ ok: boolean; reason?: string }> {
  const parsed = slugSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const [clash] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, parsed.data))
    .limit(1);
  return clash ? { ok: false, reason: "Already taken" } : { ok: true };
}

const OnboardSchema = z.object({
  plan: z.enum(["basic", "standard", "premium"]),
  instituteName: z.string().trim().min(2).max(200),
  contactEmail: z.string().trim().toLowerCase().email(),
  adminName: z.string().trim().max(200).optional().or(z.literal("")),
  slug: slugSchema,
  tagline: z.string().trim().max(240).optional().or(z.literal("")),
  brandPrimaryColor: z.string().regex(HEX).optional().or(z.literal("")),
  brandSecondaryColor: z.string().regex(HEX).optional().or(z.literal("")),
  logoUrl: z.string().url().max(2048).optional().or(z.literal("")),
  licenseUrl: z.string().url().max(2048).optional().or(z.literal("")),
  firstCourseTitle: z.string().trim().max(200).optional().or(z.literal("")),
  firstCoursePriceCents: z.coerce.number().int().min(0).max(100_000_00).optional(),
});

type Result =
  | { success: true; invited: boolean; slug: string }
  | { success: false; error: string };

/**
 * Public partner self-onboarding. Creates the institute in TRIAL state
 * (super-admin reviews/activates via existing tenant controls), emails the
 * admin a magic-link invite, and seeds an optional draft first course.
 *
 * NOTE: plan / KYC license / bank are captured in the wizard but NOT yet
 * persisted — `tenants` has no plan/kyc/bank columns (Phase-2 schema, a
 * future approved migration). The license file URL is uploaded but only
 * passed through; super-admin verifies out-of-band for now.
 */
export async function submitPartnerOnboarding(input: unknown): Promise<Result> {
  const parsed = OnboardSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const [clash] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, d.slug))
    .limit(1);
  if (clash) {
    return { success: false, error: `Subdomain "${d.slug}" is already taken.` };
  }

  const [tenant] = await db
    .insert(tenants)
    .values({
      name: d.instituteName,
      slug: d.slug,
      status: "TRIAL", // pending super-admin activation
      ...(d.tagline ? { heroTagline: d.tagline } : {}),
      ...(d.logoUrl ? { logoUrl: d.logoUrl } : {}),
      ...(d.brandPrimaryColor ? { brandPrimaryColor: d.brandPrimaryColor } : {}),
      ...(d.brandSecondaryColor ? { brandSecondaryColor: d.brandSecondaryColor } : {}),
    })
    .returning({ id: tenants.id });

  let draftCourseId: string | null = null;
  if (d.firstCourseTitle) {
    const [c] = await db
      .insert(programs)
      .values({
        name: d.firstCourseTitle,
        priceCents: d.firstCoursePriceCents ?? 0,
        currency: "USD",
        tier: "low",
        status: "draft",
        tenantId: tenant.id,
      })
      .returning({ id: programs.id });
    draftCourseId = c.id;
  }

  // Provision the admin (existing-account → instant; new → magic-link invite).
  let invited = false;
  try {
    const clerk = await clerkClient();
    const existing = await clerk.users.getUserList({
      emailAddress: [d.contactEmail],
    });
    const clerkUser = existing.data[0];

    if (clerkUser) {
      await clerk.users.updateUserMetadata(clerkUser.id, {
        publicMetadata: {
          ...(clerkUser.publicMetadata ?? {}),
          role: CANONICAL_ADMIN,
          tenantId: tenant.id,
        },
      });
      const [row] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkId, clerkUser.id))
        .limit(1);
      if (!row) {
        await db.insert(users).values({
          clerkId: clerkUser.id,
          email: d.contactEmail,
          fullName: d.adminName || d.instituteName,
          role: CANONICAL_ADMIN,
          isSuperAdmin: false,
          tenantId: tenant.id,
        });
      } else {
        await db
          .update(users)
          .set({
            role: CANONICAL_ADMIN,
            isSuperAdmin: false,
            tenantId: tenant.id,
            updatedAt: new Date(),
          })
          .where(eq(users.clerkId, clerkUser.id));
      }
    } else {
      await clerk.invitations.createInvitation({
        emailAddress: d.contactEmail,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/accept-invite`,
        publicMetadata: { role: CANONICAL_ADMIN, tenantId: tenant.id },
        notify: true,
      });
      invited = true;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/already|exists|duplicate/i.test(msg)) {
      // Atomic: undo the tenant + draft course on a hard provisioning failure.
      if (draftCourseId) {
        await db.delete(programs).where(eq(programs.id, draftCourseId));
      }
      await db.delete(tenants).where(eq(tenants.id, tenant.id));
      return {
        success: false,
        error: `Could not send the admin invite to ${d.contactEmail}: ${msg}`,
      };
    }
    invited = true;
  }

  return { success: true, invited, slug: d.slug };
}
