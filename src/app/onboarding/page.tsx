import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignOutButton } from "@clerk/nextjs";
import { Compass, UserSquare2, ArrowRight } from "lucide-react";
import { Brand } from "@/components/brand";

export const dynamic = "force-dynamic";

/**
 * Onboarding fallback — shown when a signed-in user has no normalised role
 * yet (e.g. their Clerk session arrived without role metadata, or webhook
 * provisioning hasn't caught up). For self-serve learners the sign-up flow
 * now tags role=student so they bypass this page entirely; this remains as
 * a safety net pointing at the right next steps without pushing a specific
 * product (no more Business X-Ray funnel here).
 */
export default function OnboardingPage() {
  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-secondary/20 px-6">
      <div className="absolute inset-0 -z-10 bg-grid-soft" />

      <Link href="/" className="absolute left-6 top-6">
        <Brand />
      </Link>

      <Card className="w-full max-w-md border-none bg-card shadow-soft">
        <CardHeader>
          <div
            className="mb-3 inline-flex size-10 items-center justify-center rounded-xl text-white"
            style={{ background: "linear-gradient(135deg, #8CC63F 0%, #1AADE0 100%)" }}
          >
            <Compass className="size-5" />
          </div>
          <CardTitle className="text-2xl tracking-tight">
            Welcome to eurodigital.coach
          </CardTitle>
          <CardDescription>
            You&apos;re signed in but we don&apos;t have your profile yet.
            Complete it once, then enrol in any course — paid or free — without
            re-entering your details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <Link
            href="/student/profile"
            className={buttonVariants({
              className:
                "h-11 w-full rounded-xl text-sm font-semibold text-white hover:opacity-95",
            })}
            style={{ background: "linear-gradient(135deg, #8CC63F 0%, #1AADE0 100%)" }}
          >
            <UserSquare2 className="size-4" />
            Complete your profile
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/explore"
            className={buttonVariants({
              variant: "outline",
              className: "h-11 w-full rounded-xl",
            })}
          >
            <Compass className="size-4" />
            Browse the marketplace
          </Link>
          <div className="flex justify-center pt-1">
            <SignOutButton redirectUrl="/">
              <Button variant="ghost" size="sm">
                Sign out
              </Button>
            </SignOutButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
