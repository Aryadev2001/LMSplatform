"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { students, users } from "@/db/schema";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

/**
 * Student profile completion — captures the spec'd fields: personal +
 * professional + financial info, mobile, payment preference, WhatsApp
 * consent, T&C + disclaimer acceptance. Required before purchase.
 *
 * Tenant scope is implicit (users.tenantId enforced via FK on the row
 * the student is updating). The student can only mutate their own row —
 * we look up students.userId from the session.
 */

const PersonalSchema = z.object({
  gender: z.string().trim().max(40).optional().or(z.literal("")),
  country: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  languages: z.string().trim().max(240).optional().or(z.literal("")),
  studentIdCard: z.string().trim().max(2000).optional().or(z.literal("")), // blob url
});

const ProfessionalSchema = z.object({
  occupation: z.string().trim().max(120).optional().or(z.literal("")),
  company: z.string().trim().max(200).optional().or(z.literal("")),
  industry: z.string().trim().max(120).optional().or(z.literal("")),
  experienceYears: z.coerce.number().int().min(0).max(80).optional(),
  linkedin: z.string().trim().max(2000).optional().or(z.literal("")),
});

const FinancialSchema = z.object({
  incomeRange: z.string().trim().max(60).optional().or(z.literal("")),
  fundingSource: z.string().trim().max(120).optional().or(z.literal("")),
  billingAddress: z.string().trim().max(500).optional().or(z.literal("")),
  taxId: z.string().trim().max(120).optional().or(z.literal("")),
});

const ProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  phone: z.string().trim().min(6).max(40),
  dateOfBirth: z.string().trim().optional().or(z.literal("")), // ISO YYYY-MM-DD
  address: z.string().trim().max(500).optional().or(z.literal("")),
  personal: PersonalSchema.optional(),
  professional: ProfessionalSchema.optional(),
  financial: FinancialSchema.optional(),
  paymentModePreference: z
    .enum(["card", "upi", "netbanking", "wallet"])
    .optional(),
  whatsappConsent: z.boolean().optional().default(false),
  termsAccepted: z.boolean(),
  disclaimerAccepted: z.boolean(),
});

export type ProfileResult =
  | { success: true }
  | { success: false; error: string };

function n(s: string | undefined | null): string | null {
  if (!s) return null;
  const t = s.trim();
  return t.length === 0 ? null : t;
}

export async function saveStudentProfile(
  input: z.infer<typeof ProfileSchema>,
): Promise<ProfileResult> {
  await requireRole("student");
  const me = await getCurrentUser();
  if (!me) return { success: false, error: "Sign in first." };

  const parsed = ProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const d = parsed.data;

  if (!d.termsAccepted || !d.disclaimerAccepted) {
    return {
      success: false,
      error: "You must accept the terms and disclaimer to continue.",
    };
  }

  const [meRow] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, me.userId))
    .limit(1);
  if (!meRow) return { success: false, error: "User row not found." };

  // Update full_name on users (display name) + the rest on students.
  await db
    .update(users)
    .set({ fullName: d.fullName.trim(), updatedAt: new Date() })
    .where(eq(users.id, meRow.id));

  const now = new Date();
  const dobDate = n(d.dateOfBirth);
  // Make sure a students row exists (race-tolerant insert-or-update).
  await db
    .insert(students)
    .values({
      userId: meRow.id,
      phone: d.phone.trim(),
      address: n(d.address),
      dateOfBirth: dobDate ?? null,
      personalInfo: d.personal ?? {},
      professionalInfo: d.professional ?? {},
      financialInfo: d.financial ?? {},
      paymentModePreference: d.paymentModePreference ?? null,
      whatsappConsent: d.whatsappConsent ?? false,
      termsAcceptedAt: now,
      disclaimerAcceptedAt: now,
      profileCompletedAt: now,
    })
    .onConflictDoUpdate({
      target: students.userId,
      set: {
        phone: d.phone.trim(),
        address: n(d.address),
        dateOfBirth: dobDate ?? null,
        personalInfo: d.personal ?? {},
        professionalInfo: d.professional ?? {},
        financialInfo: d.financial ?? {},
        paymentModePreference: d.paymentModePreference ?? null,
        whatsappConsent: d.whatsappConsent ?? false,
        termsAcceptedAt: now,
        disclaimerAcceptedAt: now,
        profileCompletedAt: now,
      },
    });

  await recordAudit({
    action: "student.profile.save",
    targetType: "user",
    targetId: meRow.id,
    metadata: {
      hasPhone: !!d.phone,
      hasAddress: !!n(d.address),
      whatsappConsent: d.whatsappConsent === true,
    },
  });

  revalidatePath("/student/profile");
  revalidatePath("/student");
  return { success: true };
}
