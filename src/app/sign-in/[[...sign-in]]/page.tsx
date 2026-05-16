import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignInPage() {
  return (
    <AuthShell
      eyebrow="— Student sign in"
      title="Welcome back"
      description="Sign in to your EDT learning dashboard with magic link."
    >
      {/* Student portal is fully separate from admin — always lands on /student */}
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl="/student"
        fallbackRedirectUrl="/student"
      />
    </AuthShell>
  );
}
