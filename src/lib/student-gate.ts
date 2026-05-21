import { cache } from "react";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { students, enrollments, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

/**
 * Student onboarding gate.
 *
 * A signed-in student must:
 *   1. Complete their profile form (mobile, T&C, disclaimer) — surfaced as
 *      students.profile_completed_at.
 *   2. Have at least one paid / account_created / assigned enrollment.
 *
 * Until both are true the dashboard isn't useful: there's nothing to learn
 * yet. We redirect them to the right next step instead of dumping them into
 * an empty dashboard.
 *
 * Request-cached so the layout, page, and any nested server component share
 * one DB roundtrip per request.
 */

const PAID_STATUSES = ["paid", "account_created", "assigned"] as const;

export interface StudentOnboardingState {
  /** users.id (the DB id, not the Clerk id). */
  userDbId: string;
  profileComplete: boolean;
  paidEnrollmentCount: number;
}

export const loadStudentOnboarding = cache(
  async (): Promise<StudentOnboardingState | null> => {
    const me = await getCurrentUser();
    if (!me || me.role !== "student") return null;

    const [u] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, me.userId))
      .limit(1);
    if (!u) return null;

    const [st] = await db
      .select({ profileCompletedAt: students.profileCompletedAt })
      .from(students)
      .where(eq(students.userId, u.id))
      .limit(1);

    const paidEnrollments = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, u.id),
          inArray(enrollments.status, [...PAID_STATUSES]),
        ),
      );

    return {
      userDbId: u.id,
      profileComplete: !!st?.profileCompletedAt,
      paidEnrollmentCount: paidEnrollments.length,
    };
  },
);

/**
 * Redirect-throw helper for any /student/* route that requires a fully
 * onboarded student. Profile incomplete → /student/profile. Profile
 * complete but no paid enrollment yet → /explore?welcome=1. Super-admins
 * who are impersonating bypass both checks (they're testing tenant flows,
 * not learning).
 */
export async function requireOnboardedStudent(): Promise<void> {
  const me = await getCurrentUser();
  if (!me) redirect("/sign-in");
  // Super-admins impersonating a student still pass — they need to see
  // the dashboard from any tenant's perspective.
  if (me.rawRole && me.rawRole.startsWith("SUPER_")) return;
  if (me.role !== "student") return;

  const state = await loadStudentOnboarding();
  if (!state) return; // shouldn't happen — fail open rather than block.
  if (!state.profileComplete) redirect("/student/profile?required=1");
  if (state.paidEnrollmentCount === 0) redirect("/explore?welcome=1");
}
