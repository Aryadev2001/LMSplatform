import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getRootDomain } from "@/lib/tenant";
import { loadStudentOnboarding } from "@/lib/student-gate";

export const dynamic = "force-dynamic";

/**
 * Sends the user to the right place AFTER Clerk sign-in. When the app is
 * served across portal subdomains (NEXT_PUBLIC_ROOT_DOMAIN set in prod),
 * admin / student users land on their dedicated subdomain so every
 * dashboard truly lives under partner. / student. ; in local / preview
 * (no root domain configured) we use relative paths so dev keeps working.
 *
 * For students we also branch on onboarding state:
 *   - Profile incomplete           → /student/profile
 *   - Profile done, no enrollments → /explore?welcome=1 (pick a course)
 *   - Otherwise                    → /student
 * This stops a brand-new learner from being dropped into an empty
 * dashboard and means the dashboard only shows up once it's useful.
 *
 * Cross-subdomain redirects rely on the Clerk session cookie being shared
 * across `.<root>` — that requires those subdomains to be configured as
 * allowed / satellite domains on your Clerk production instance.
 */
export default async function PostLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    const ticket = sp.__clerk_ticket;
    if (typeof ticket === "string" && ticket.length > 0) {
      redirect(`/accept-invite?__clerk_ticket=${encodeURIComponent(ticket)}`);
    }
    redirect("/sign-in");
  }

  const root = getRootDomain();

  // Student onboarding-aware routing.
  if (user.role === "student") {
    const state = await loadStudentOnboarding();
    if (state && !state.profileComplete) {
      redirect("/student/profile?required=1");
    }
    if (state && state.paidEnrollmentCount === 0) {
      redirect("/explore?welcome=1");
    }
    redirect(
      root ? `https://student.${root}/student` : "/student",
    );
  }

  const target = (() => {
    if (user.role === "super") {
      return root ? `https://admin.${root}/super-admin` : "/super-admin";
    }
    if (user.role === "admin") {
      return root ? `https://partner.${root}/admin` : "/admin";
    }
    return "/onboarding";
  })();

  redirect(target);
}
