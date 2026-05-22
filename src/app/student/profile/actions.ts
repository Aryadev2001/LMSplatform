"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
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

/**
 * Persist a Clerk-verified phone number to the students row. Called by
 * the PhoneVerification widget after Clerk reports the OTP succeeded.
 *
 * Critically, we DO NOT trust the client's claim that the number is
 * verified. We re-fetch the Clerk user server-side and confirm that
 * (a) the phone exists on that user, and (b) Clerk's verification.status
 * for that phone is "verified". If anything fails the check the row is
 * not updated and the action returns an error.
 */
export async function persistVerifiedPhone(
  phoneNumber: string,
): Promise<{ success: true } | { success: false; error: string }> {
  await requireRole("student");
  const me = await getCurrentUser();
  if (!me) return { success: false, error: "Sign in first." };

  const trimmed = phoneNumber.trim();
  if (trimmed.length < 6) {
    return { success: false, error: "Phone number looks invalid." };
  }

  // Server-side verification: re-read the Clerk user and confirm the
  // phone is actually verified there. The client can't lie its way past
  // this — Clerk is the source of truth.
  try {
    const clerk = await clerkClient();
    const cu = await clerk.users.getUser(me.userId);
    const pn = cu.phoneNumbers.find((p) => p.phoneNumber === trimmed);
    if (!pn) {
      return {
        success: false,
        error:
          "That number isn't attached to your account in Clerk yet — finish the OTP step first.",
      };
    }
    if (pn.verification?.status !== "verified") {
      return {
        success: false,
        error: "Clerk still shows this number as unverified.",
      };
    }
  } catch (e) {
    return {
      success: false,
      error:
        "Could not confirm verification with Clerk: " +
        (e instanceof Error ? e.message : "unknown error"),
    };
  }

  const [meRow] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, me.userId))
    .limit(1);
  if (!meRow) return { success: false, error: "User row not found." };

  const now = new Date();
  // Idempotent upsert — if no students row exists yet (learner verifies
  // before they fill the rest of the profile), create one with just the
  // verified phone.
  await db
    .insert(students)
    .values({
      userId: meRow.id,
      phone: trimmed,
      phoneVerifiedAt: now,
    })
    .onConflictDoUpdate({
      target: students.userId,
      set: { phone: trimmed, phoneVerifiedAt: now },
    });

  await recordAudit({
    action: "student.phone.verified",
    targetType: "user",
    targetId: meRow.id,
    metadata: { phoneHash: hashPhone(trimmed) },
  });

  revalidatePath("/student/profile");
  return { success: true };
}

function hashPhone(phone: string): string {
  // Audit logs are reviewed by super-admins. We log a short fingerprint
  // instead of the raw number so an audit-log leak doesn't include PII.
  let h = 0;
  for (let i = 0; i < phone.length; i++)
    h = ((h * 31 + phone.charCodeAt(i)) >>> 0) % 0xffffffff;
  return h.toString(16).padStart(8, "0");
}

export async function saveStudentProfile(
  input: z.infer<typeof ProfileSchema>,
): Promise<ProfileResult> {
  await requireRole("student");
  const me = await getCurrentUser();
  if (!me) return { success: false, error: "Sign in first." };

  const parsed = ProfileSchema.safeParse(input);
  if (!parsed.success) {
    // Field-named error so the user can see *which* field is wrong instead
    // of a generic "Invalid input" toast they'll dismiss without action.
    const issue = parsed.error.issues[0];
    const path = issue?.path?.join(".") || "form";
    const msg = issue?.message ?? "Invalid value";
    console.warn(
      `[saveStudentProfile] zod-rejected — ${path}: ${msg}`,
      parsed.error.issues,
    );
    return { success: false, error: `${path}: ${msg}` };
  }
  const d = parsed.data;

  if (!d.termsAccepted) {
    return {
      success: false,
      error:
        "termsAccepted: please check 'I have read and accept the Terms & Conditions' at the bottom of the form.",
    };
  }
  if (!d.disclaimerAccepted) {
    return {
      success: false,
      error:
        "disclaimerAccepted: please check 'I acknowledge the learner disclaimer' at the bottom of the form.",
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
