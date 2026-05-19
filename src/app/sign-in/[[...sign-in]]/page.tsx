import { SignIn } from "@clerk/nextjs";
import { AnimatedAuth } from "@/components/euro/animated-auth";
import { clerkAppearance } from "@/components/euro/clerk-appearance";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Log in — eurodigital.coach",
};

export default function SignInPage() {
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
