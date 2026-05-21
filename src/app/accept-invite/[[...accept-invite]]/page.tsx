import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata = {
  title: "Accept your invitation — eurodigital.coach",
  robots: "noindex, nofollow",
};

/**
 * Invitation acceptance. Clerk invitation links arrive here with a
 * `__clerk_ticket` query param; <SignUp> auto-detects it, locks the email to
 * the invited address, and CREATES the account (a plain <SignIn> can't — that
 * was the bug: invites pointed at /post-login → bounced to the student
 * /sign-in, ticket dropped, "account not found").
 *
 * The invitation's publicMetadata (role + tenantId) is transferred to the new
 * user by Clerk; after sign-up we route through /post-login, where
 * getCurrentUser() JIT-provisions the tenant-scoped row and sends them to the
 * right dashboard (TENANT_ADMIN → /admin, SUPER_* → /super-admin, …).
 */
export default function AcceptInvitePage() {
  return (
    <AuthShell
      eyebrow="— You're invited"
      title="Accept your invitation"
      description="Set up your access. We've pre-filled your invited email — just verify the code we send you."
    >
      <SignUp
        routing="path"
        path="/accept-invite"
        signInUrl="/sign-in"
        forceRedirectUrl="/post-login"
        fallbackRedirectUrl="/post-login"
      />
    </AuthShell>
  );
}
