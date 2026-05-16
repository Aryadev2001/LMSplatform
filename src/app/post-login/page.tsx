import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PostLoginPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

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
