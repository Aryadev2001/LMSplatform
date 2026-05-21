import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "@clerk/nextjs";
import { Activity, BookOpen } from "lucide-react";
import { Brand } from "@/components/brand";

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
            <BookOpen className="size-5" />
          </div>
          <CardTitle className="text-2xl tracking-tight">No active course yet</CardTitle>
          <CardDescription>
            Your account isn&apos;t enrolled in a program. Access at eurodigital.coach is granted when you enrol
            in a course — there&apos;s no waiting on an admin. Start with the free Business X-Ray to
            find the right program for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <Link
            href="/diagnostic"
            className={buttonVariants({
              className:
                "h-11 w-full rounded-xl text-sm font-semibold text-white hover:opacity-95",
            })}
            style={{ background: "linear-gradient(135deg, #8CC63F 0%, #1AADE0 100%)" }}
          >
            <Activity className="size-4" />
            Take the free Business X-Ray
          </Link>
          <Link
            href="/courses/business-x-ray"
            className={buttonVariants({
              variant: "outline",
              className: "h-11 w-full rounded-xl",
            })}
          >
            Browse programs
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
