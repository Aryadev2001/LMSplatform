import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignInPage() {
  return (
    <AuthShell
      eyebrow="— Student sign in"
      title="Welcome back"
      description="Sign in to your EDT learning dashboard with magic link."
    >
      {/* Route by role: /post-login sends each user to their own dashboard,
          so an admin who lands here is never trapped in the student app. */}
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl="/post-login"
        fallbackRedirectUrl="/post-login"
      />
    </AuthShell>
  );
}
