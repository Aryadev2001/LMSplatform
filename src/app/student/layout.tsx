import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getStudentSnapshot } from "@/lib/student";
import { requireOnboardedStudent } from "@/lib/student-gate";
import { StudentSidebar } from "@/components/euro/student-sidebar";

export const dynamic = "force-dynamic";

/**
 * Student dashboard shell. Gates every page under /student EXCEPT:
 *   - /student/profile (always accessible — that's the onboarding step the
 *     gate sends people to)
 *   - any super-admin impersonating a student (handled inside
 *     requireOnboardedStudent)
 *
 * The gate checks (a) the profile form is complete and (b) the student
 * has at least one paid enrollment. Until both are true the dashboard is
 * empty and confusing; sending the learner to the next concrete step
 * (profile form → marketplace → enrol) is the right UX.
 */
export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireRole("student");

  // Skip the onboarding gate for the profile page itself — otherwise it
  // would redirect a learner with an incomplete profile to /student/profile
  // in an infinite loop. x-pathname is set by proxy.ts middleware.
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";
  const isProfilePage = pathname.startsWith("/student/profile");

  if (!isProfilePage) {
    await requireOnboardedStudent();
  }

  const snap = await getStudentSnapshot(auth.userId);
  if (!snap) redirect("/sign-in");

  return (
    <div
      className="flex min-h-screen"
      style={{ background: "var(--ed-bg)" }}
    >
      <StudentSidebar
        name={snap.fullName}
        studentCode={snap.studentCode}
        points={snap.pointsBalance}
        activeCourses={snap.counts.activeCourses}
        completed={snap.counts.completed}
      />
      <main className="flex-1 overflow-x-hidden px-8 py-8">{children}</main>
    </div>
  );
}
