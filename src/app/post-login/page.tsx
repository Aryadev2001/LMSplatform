import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PostLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    // Salvage already-emailed invitation links that pointed here: a Clerk
    // invite ticket must be consumed by <SignUp> on /accept-invite, not
    // dropped onto the student /sign-in.
    const ticket = sp.__clerk_ticket;
    if (typeof ticket === "string" && ticket.length > 0) {
      redirect(`/accept-invite?__clerk_ticket=${encodeURIComponent(ticket)}`);
    }
    redirect("/sign-in");
  }

  switch (user.role) {
    case "super":
      redirect("/super-admin");
    case "admin":
      redirect("/admin");
    case "student":
      redirect("/student");
    default:
      redirect("/onboarding");
  }
}
