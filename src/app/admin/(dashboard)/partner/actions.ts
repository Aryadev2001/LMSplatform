"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { tenants } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { recordAudit } from "@/lib/audit";

/**
 * Server actions for the partner-onboarding wizard. Each step persists
 * immediately so progress is never lost mid-wizard. Tenant-scoped (no path
 * by which a tenant admin can update another tenant's row).
 */

const SocialsSchema = z
  .object({
    website: z.string().trim().max(2000).optional().or(z.literal("")),
    linkedin: z.string().trim().max(2000).optional().or(z.literal("")),
    twitter: z.string().trim().max(2000).optional().or(z.literal("")),
    instagram: z.string().trim().max(2000).optional().or(z.literal("")),
    facebook: z.string().trim().max(2000).optional().or(z.literal("")),
    youtube: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .partial();

const BusinessStepSchema = z.object({
  legalName: z.string().trim().max(240).optional().or(z.literal("")),
  regNumber: z.string().trim().max(120).optional().or(z.literal("")),
  regDocUrl: z.string().trim().max(2000).optional().or(z.literal("")),
  addressLine1: z.string().trim().max(240).optional().or(z.literal("")),
  addressLine2: z.string().trim().max(240).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  state: z.string().trim().max(120).optional().or(z.literal("")),
  postalCode: z.string().trim().max(40).optional().or(z.literal("")),
  country: z.string().trim().max(2).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  annualRevenueRange: z.string().trim().max(60).optional().or(z.literal("")),
  taxId: z.string().trim().max(120).optional().or(z.literal("")),
  bankReference: z.string().trim().max(240).optional().or(z.literal("")),
});

const BrandingStepSchema = z.object({
  companyProfile: z.string().trim().max(4000).optional().or(z.literal("")),
  socials: SocialsSchema.optional(),
});

const OwnerStepSchema = z.object({
  name: z.string().trim().max(200).optional().or(z.literal("")),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  photoUrl: z.string().trim().max(2000).optional().or(z.literal("")),
  profile: z.string().trim().max(4000).optional().or(z.literal("")),
  socials: SocialsSchema.optional(),
});

export type StepResult =
  | { success: true }
  | { success: false; error: string };

function emptyToNull(s: string | undefined | null): string | null {
  if (!s) return null;
  const t = s.trim();
  return t.length === 0 ? null : t;
}

export async function saveBusinessStep(
  input: z.infer<typeof BusinessStepSchema>,
): Promise<StepResult> {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  const parsed = BusinessStepSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  await db
    .update(tenants)
    .set({
      businessLegalName: emptyToNull(d.legalName),
      businessRegNumber: emptyToNull(d.regNumber),
      businessRegDocUrl: emptyToNull(d.regDocUrl),
      businessAddressLine1: emptyToNull(d.addressLine1),
      businessAddressLine2: emptyToNull(d.addressLine2),
      businessCity: emptyToNull(d.city),
      businessState: emptyToNull(d.state),
      businessPostalCode: emptyToNull(d.postalCode),
      businessCountry: emptyToNull(d.country)?.toUpperCase() ?? null,
      businessPhone: emptyToNull(d.phone),
      businessFinancialInfo: {
        annualRevenueRange: emptyToNull(d.annualRevenueRange),
        taxId: emptyToNull(d.taxId),
        bankReference: emptyToNull(d.bankReference),
      },
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId));
  await recordAudit({
    action: "partner.onboard.business_saved",
    targetType: "tenant",
    targetId: tenantId,
    metadata: { tenantId },
  });
  revalidatePath("/admin/partner");
  revalidatePath("/admin/partner/onboard");
  return { success: true };
}

export async function saveBrandingStep(
  input: z.infer<typeof BrandingStepSchema>,
): Promise<StepResult> {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  const parsed = BrandingStepSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  await db
    .update(tenants)
    .set({
      companyProfile: emptyToNull(d.companyProfile),
      companySocials: d.socials ?? {},
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId));
  await recordAudit({
    action: "partner.onboard.branding_saved",
    targetType: "tenant",
    targetId: tenantId,
    metadata: { tenantId },
  });
  revalidatePath("/admin/partner");
  revalidatePath("/admin/partner/onboard");
  return { success: true };
}

export async function saveOwnerStep(
  input: z.infer<typeof OwnerStepSchema>,
): Promise<StepResult> {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  const parsed = OwnerStepSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  await db
    .update(tenants)
    .set({
      ownerName: emptyToNull(d.name),
      ownerTitle: emptyToNull(d.title),
      ownerPhotoUrl: emptyToNull(d.photoUrl),
      ownerProfile: emptyToNull(d.profile),
      ownerSocials: d.socials ?? {},
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId));
  await recordAudit({
    action: "partner.onboard.owner_saved",
    targetType: "tenant",
    targetId: tenantId,
    metadata: { tenantId },
  });
  revalidatePath("/admin/partner");
  revalidatePath("/admin/partner/onboard");
  return { success: true };
}

export async function finalizeOnboarding(): Promise<StepResult> {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  await recordAudit({
    action: "partner.onboard.finalized",
    targetType: "tenant",
    targetId: tenantId,
    metadata: { tenantId },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/partner");
  return { success: true };
}
