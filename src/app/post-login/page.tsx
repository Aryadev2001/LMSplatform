import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getRootDomain } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * Sends the user to the right place AFTER Clerk sign-in. When the app is
 * served across portal subdomains (NEXT_PUBLIC_ROOT_DOMAIN set in prod),
 * admin/student users land on their dedicated subdomain so every dashboard
 * truly lives under partner./student.; in local/preview (no root domain
 * configured) we use relative paths so dev keeps working.
 *
 * Cross-subdomain redirects rely on the Clerk session cookie being shared
 * across `.<root>` — that requires those subdomains to be configured as
 * allowed/satellite domains on your Clerk production instance.
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
  const target = (() => {
    if (user.role === "super") {
      return root ? `https://admin.${root}/super-admin` : "/super-admin";
    }
    if (user.role === "admin") {
      return root ? `https://partner.${root}/admin` : "/admin";
    }
    if (user.role === "student") {
      return root ? `https://student.${root}/student` : "/student";
    }
    return "/onboarding";
  })();

  redirect(target);
}
