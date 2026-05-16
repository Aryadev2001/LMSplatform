import Link from "next/link";
import { db } from "@/db/client";
import { programs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Brand } from "@/components/brand";
import { EnrollmentForm } from "./enrollment-form";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Zap, GraduationCap } from "lucide-react";
import { formatInr } from "@/lib/courses";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Enroll — EDT",
  description: "Enrol in an EDT program. Pay once, get instant magic-link access.",
};

export default async function EnrollPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const { course: courseParam } = await searchParams;

  // Resolve the course — from ?course= or default to the ₹99 entry product.
  const [course] =
    (courseParam
      ? await db.select().from(programs).where(eq(programs.slug, courseParam)).limit(1)
      : []) ?? [];
  const [fallback] = course
    ? [course]
    : await db.select().from(programs).where(eq(programs.slug, "business-x-ray")).limit(1);
  const selected = course ?? fallback;

  return (
    <div className="relative isolate flex min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 -z-10 bg-grid-soft" />

      <Link href="/" className="absolute left-6 top-6 z-20">
        <Brand />
      </Link>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-24 lg:flex-row lg:gap-16">
        {/* Left — order context */}
        <div className="flex-1 lg:pt-12">
          <div className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            — Enrollment
          </div>
          <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tighter md:text-5xl">
            Enrol in{" "}
            <span className="text-brand-gradient">{selected?.name ?? "your program"}</span>
          </h1>
          <p className="mt-4 max-w-md text-balance text-muted-foreground md:text-lg">
            {selected?.tagline ?? "Fill in your details, then complete a quick secure checkout."}
          </p>

          {selected && (
            <div className="mt-6 inline-flex items-baseline gap-2 rounded-xl bg-secondary/60 px-4 py-3">
              <span className="text-2xl font-bold">{formatInr(selected.priceCents)}</span>
              <span className="text-xs text-muted-foreground">
                {selected.type === "subscription" ? "per quarter" : "one-time"}
              </span>
            </div>
          )}

          <ul className="mt-10 max-w-md space-y-4">
            <Bullet icon={ShieldCheck} title="Payment-gated access" body="Secure checkout — your account is created the moment payment clears." />
            <Bullet icon={Zap} title="Instant access" body="No waiting, no admin approval. Sign in and start immediately." />
            <Bullet icon={GraduationCap} title="Lifetime access" body="Video modules, progress tracking, and a completion certificate." />
          </ul>
        </div>

        {/* Right — details form */}
        <div className="w-full lg:w-[460px] lg:flex-shrink-0">
          <Card className="border-none bg-card shadow-card">
            <CardContent className="p-7">
              <div className="mb-6">
                <div className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Step 1 of 2 — Your details
                </div>
                <h2 className="text-xl font-semibold tracking-tight">Tell us about you</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Takes less than a minute. Next: secure payment.
                </p>
              </div>
              <EnrollmentForm courseSlug={selected?.slug ?? "business-x-ray"} />
            </CardContent>
          </Card>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Already enrolled?{" "}
            <Link
              href="/sign-in"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Bullet({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof ShieldCheck;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white">
        <Icon className="size-4" />
      </div>
      <div>
        <div className="text-sm font-semibold tracking-tight">{title}</div>
        <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
      </div>
    </li>
  );
}
