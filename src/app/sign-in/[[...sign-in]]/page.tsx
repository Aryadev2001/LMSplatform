import { SignIn } from "@clerk/nextjs";
import { AnimatedAuth } from "@/components/euro/animated-auth";
import { AlreadySignedIn } from "@/components/euro/already-signed-in";
import { clerkAppearance } from "@/components/euro/clerk-appearance";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Log in — eurodigital.coach",
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

export default async function SignInPage() {
  const user = await getCurrentUser();

  // Already-signed-in visitors would otherwise be silently bounced by Clerk's
  // forceRedirectUrl. Show an interstitial so they can choose to sign out.
  if (user) {
    const { href, label } = dashboardFor(user.role);
    return (
      <AnimatedAuth tab="login">
        <AlreadySignedIn
          email={user.email ?? null}
          dashboardLabel={label}
          dashboardHref={href}
          context="sign-in"
        />
      </AnimatedAuth>
    );
  }

  return (
    <AnimatedAuth tab="login">
      <h2
        className="font-display text-[26px] leading-tight tracking-tight"
        style={{ color: "var(--ed-ink)" }}
      >
        Log in to your account
      </h2>
      <p className="mt-1.5 text-sm" style={{ color: "var(--ed-mute)" }}>
        Enter your email and we&apos;ll send you a secure one-time link.
      </p>

      {/* /post-login routes by role so an institute admin is never trapped
          in the learner app. */}
      <div className="euro-clerk mt-7">
        <SignIn
          appearance={clerkAppearance}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          forceRedirectUrl="/post-login"
          fallbackRedirectUrl="/post-login"
        />
      </div>
    </AnimatedAuth>
  );
}
