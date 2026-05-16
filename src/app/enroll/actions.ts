"use server";

import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { enrollments, programs, payments, users, students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CANONICAL_STUDENT } from "@/lib/auth";

const EnrollmentSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name").max(200),
  email: z.email("Please enter a valid email"),
  phone: z.string().max(30).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  courseSlug: z.string().min(1, "No course selected"),
});

export type EnrollmentInput = z.infer<typeof EnrollmentSchema>;

export type EnrollmentResult =
  | { success: true; enrollmentId: string }
  | { success: false; error: string; fieldErrors?: Partial<Record<keyof EnrollmentInput, string>> };

/** Step 1 — capture details, create a pending enrollment, go to payment. */
export async function submitEnrollment(input: EnrollmentInput): Promise<EnrollmentResult> {
  const parsed = EnrollmentSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof EnrollmentInput, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof EnrollmentInput | undefined;
      if (key) fieldErrors[key] = issue.message;
    }
    return { success: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const { fullName, email, phone, notes, courseSlug } = parsed.data;

  const [course] = await db
    .select({ id: programs.id })
    .from(programs)
    .where(eq(programs.slug, courseSlug))
    .limit(1);
  if (!course) {
    return { success: false, error: "That course no longer exists." };
  }

  const [enrollment] = await db
    .insert(enrollments)
    .values({
      fullName,
      email: email.toLowerCase(),
      phone: phone || null,
      notes: notes || null,
      programId: course.id,
      status: "pending",
    })
    .returning({ id: enrollments.id });

  return { success: true, enrollmentId: enrollment.id };
}

export type PaymentResult =
  | { success: true; email: string }
  | { success: false; error: string };

/**
 * Step 2 — MOCK payment. In production this is the Stripe/Razorpay webhook.
 * It marks paid, records the payment, then provisions the student account +
 * course access DIRECTLY (no Clerk webhook dependency) so access is instant.
 */
export async function completeMockPayment(enrollmentId: string): Promise<PaymentResult> {
  const [enr] = await db
    .select()
    .from(enrollments)
    .where(eq(enrollments.id, enrollmentId))
    .limit(1);
  if (!enr) return { success: false, error: "Enrollment not found." };
  if (!enr.programId) return { success: false, error: "No course on this enrollment." };

  const [course] = await db
    .select()
    .from(programs)
    .where(eq(programs.id, enr.programId))
    .limit(1);
  if (!course) return { success: false, error: "Course not found." };

  const email = enr.email.toLowerCase();

  // 1. Mark paid + record payment
  await db
    .update(enrollments)
    .set({ status: "paid", updatedAt: new Date() })
    .where(eq(enrollments.id, enrollmentId));

  await db.insert(payments).values({
    enrollmentId,
    amountCents: course.priceCents,
    currency: course.currency,
    status: "succeeded",
    description: `${course.name} — enrollment`,
    paymentMethodLabel: "Test mode",
    stripePaymentIntentId: `pi_mock_${Math.random().toString(36).slice(2, 12)}`,
  });

  // 2. Provision the Clerk user (create if missing) with role=student
  const clerk = await clerkClient();
  const existing = await clerk.users.getUserList({ emailAddress: [email] });
  let clerkUser = existing.data[0];

  try {
    if (!clerkUser) {
      clerkUser = await clerk.users.createUser({
        emailAddress: [email],
        firstName: enr.fullName?.split(" ")[0],
        lastName: enr.fullName?.split(" ").slice(1).join(" ") || undefined,
        publicMetadata: { role: CANONICAL_STUDENT, enrollmentId },
        skipPasswordRequirement: true,
        skipPasswordChecks: true,
      });
    } else {
      await clerk.users.updateUserMetadata(clerkUser.id, {
        publicMetadata: { ...(clerkUser.publicMetadata ?? {}), role: CANONICAL_STUDENT, enrollmentId },
      });
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Could not create your account.",
    };
  }

  // 3. Upsert our DB users row + students row + assign the course
  const [dbUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkUser.id))
    .limit(1);

  let userId: string;
  if (!dbUser) {
    const [row] = await db
      .insert(users)
      .values({
        clerkId: clerkUser.id,
        email,
        fullName: enr.fullName,
        role: CANONICAL_STUDENT,
      })
      .returning({ id: users.id });
    userId = row.id;
  } else {
    userId = dbUser.id;
    await db
      .update(users)
      .set({ role: CANONICAL_STUDENT, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  const [stu] = await db
    .select({ userId: students.userId })
    .from(students)
    .where(eq(students.userId, userId))
    .limit(1);
  if (!stu) {
    await db.insert(students).values({
      userId,
      enrollmentId,
      assignedProgramId: course.id,
      phone: enr.phone,
    });
  } else {
    await db
      .update(students)
      .set({ assignedProgramId: course.id, enrollmentId })
      .where(eq(students.userId, userId));
  }

  await db
    .update(enrollments)
    .set({ status: "account_created", userId, updatedAt: new Date() })
    .where(eq(enrollments.id, enrollmentId));

  return { success: true, email };
}
