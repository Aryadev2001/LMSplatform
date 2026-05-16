import Link from "next/link";
import { Brand } from "@/components/brand";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Payment complete — EDT",
};

export default async function EnrollSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-secondary/20 px-6 py-12">
      <div className="absolute inset-0 -z-10 bg-grid-soft" />

      <Link href="/" className="absolute left-6 top-6">
        <Brand />
      </Link>

      <Card className="w-full max-w-md border-none bg-card shadow-soft">
        <CardContent className="p-8 text-center">
          <div
            className="mx-auto mb-5 inline-flex size-14 items-center justify-center rounded-2xl text-white"
            style={{ background: "linear-gradient(135deg, #8CC63F 0%, #1AADE0 100%)" }}
          >
            <CheckCircle2 className="size-7" />
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            — Payment successful
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            You&apos;re in 🎉
          </h1>
          <p className="mt-3 text-balance text-sm text-muted-foreground md:text-base">
            Your account for{" "}
            <span className="font-medium text-foreground">{email ?? "your email"}</span> has been
            created and your course is unlocked. Sign in to start learning.
          </p>

          <div className="mt-7 rounded-xl border border-black/8 bg-secondary/40 p-4 text-left">
            <ol className="space-y-2 text-xs text-muted-foreground">
              <li>1. Click &ldquo;Sign in&rdquo; below</li>
              <li>2. Enter {email ?? "your email"} — we&apos;ll email a 6-digit code</li>
              <li>3. Land on your student dashboard with the course unlocked</li>
            </ol>
          </div>

          <Link
            href="/sign-in"
            className={buttonVariants({
              className:
                "mt-6 h-12 w-full rounded-xl text-sm font-semibold text-white hover:opacity-95",
            })}
            style={{ background: "linear-gradient(135deg, #8CC63F 0%, #1AADE0 100%)" }}
          >
            Sign in &amp; start
            <ArrowRight className="size-4" />
          </Link>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Need help? <span className="font-medium text-foreground">support@edt.ae</span>
      </p>
    </div>
  );
}
