import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="— Create account"
      title="Join EDT"
      description="If you're a paying student, your account is created automatically — check your email."
    >
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/student"
        fallbackRedirectUrl="/student"
      />
    </AuthShell>
  );
}
