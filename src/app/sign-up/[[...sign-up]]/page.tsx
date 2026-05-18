import { AuthSplit } from "@/components/euro/auth-split";
import { SignUpPanel } from "./sign-up-panel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign up — eurodigital.coach",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  return (
    <AuthSplit tab="signup">
      <SignUpPanel refCode={ref ?? null} />
    </AuthSplit>
  );
}
