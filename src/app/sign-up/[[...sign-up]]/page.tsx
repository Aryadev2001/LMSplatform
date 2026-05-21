import { AnimatedAuth } from "@/components/euro/animated-auth";
import { AlreadySignedIn } from "@/components/euro/already-signed-in";
import { SignUpPanel } from "./sign-up-panel";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign up — eurodigital.coach",
};

function dashboardFor(role: "admin" | "student" | "super" | null): {
  href: string;
  label: string;
} {
  if (role === "super") return { href: "/super-admin", label: "Continue to super-admin" };
  if (role === "admin") return { href: "/admin", label: "Continue to partner dashboard" };
  if (role === "student") return { href: "/student", label: "Continue to your dashboard" };
  return { href: "/post-login", label: "Continue" };
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const user = await getCurrentUser();

  // Already-signed-in visitors would otherwise be silently bounced by Clerk's
  // forceRedirectUrl. Show an interstitial so they can sign out to QA the
  // sign-up flow as a fresh visitor.
  if (user) {
    const { href, label } = dashboardFor(user.role);
    return (
      <AnimatedAuth tab="signup">
        <AlreadySignedIn
          email={user.email ?? null}
          dashboardLabel={label}
          dashboardHref={href}
          context="sign-up"
        />
      </AnimatedAuth>
    );
  }

  return (
    <AnimatedAuth tab="signup">
      <SignUpPanel refCode={ref ?? null} />
    </AnimatedAuth>
  );
}
