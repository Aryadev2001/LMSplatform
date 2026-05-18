import { SignIn } from "@clerk/nextjs";
import { AuthSplit } from "@/components/euro/auth-split";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Login — eurodigital.coach",
};

export default function SignInPage() {
  return (
    <AuthSplit tab="login">
      <h2
        className="text-2xl font-extrabold tracking-tight"
        style={{ color: "var(--ed-ink)" }}
      >
        Welcome back
      </h2>
      <p className="mt-1 text-sm" style={{ color: "var(--ed-mute)" }}>
        Log in to continue learning. We route you to the right dashboard
        automatically.
      </p>
      {/* /post-login routes by role so an institute admin is never trapped
          in the learner app. */}
      <div className="euro-clerk mt-6">
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          forceRedirectUrl="/post-login"
          fallbackRedirectUrl="/post-login"
        />
      </div>
    </AuthSplit>
  );
}
