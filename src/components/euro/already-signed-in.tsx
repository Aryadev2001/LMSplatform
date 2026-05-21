"use client";

import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { CheckCircle2, LogOut } from "lucide-react";

/**
 * Rendered on /sign-in and /sign-up when the visitor already has a Clerk
 * session. Without this, Clerk's <SignIn>/<SignUp> components auto-redirect
 * to `forceRedirectUrl` and the user can never SEE the auth pages while
 * signed in (e.g. to QA the sign-up flow as a fresh visitor). Offers two
 * explicit actions: continue, or sign out and stay.
 */
export function AlreadySignedIn({
  email,
  dashboardLabel,
  dashboardHref,
  context,
}: {
  email: string | null;
  dashboardLabel: string;
  dashboardHref: string;
  context: "sign-in" | "sign-up";
}) {
  return (
    <div>
      <h2
        className="font-display text-[26px] leading-tight tracking-tight"
        style={{ color: "var(--ed-ink)" }}
      >
        You&apos;re already signed in
      </h2>
      <p className="mt-1.5 text-sm" style={{ color: "var(--ed-mute)" }}>
        {context === "sign-up"
          ? "Sign out first if you want to create a new account from scratch."
          : "Continue to your dashboard, or sign out to log in as someone else."}
      </p>

      <div
        className="mt-6 flex items-center gap-3 rounded-2xl border bg-white p-4"
        style={{ borderColor: "var(--ed-line)" }}
      >
        <span
          className="flex size-9 items-center justify-center rounded-full"
          style={{ background: "rgba(141,198,63,0.12)" }}
        >
          <CheckCircle2 className="size-5" style={{ color: "var(--ed-green)" }} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--ed-mute)" }}>
            Signed in as
          </div>
          <div className="truncate text-sm font-bold" style={{ color: "var(--ed-ink)" }}>
            {email ?? "your account"}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Link
          href={dashboardHref}
          className="inline-flex flex-1 items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--ed-gradient)" }}
        >
          {dashboardLabel}
        </Link>
        <SignOutButton redirectUrl={context === "sign-in" ? "/sign-in" : "/sign-up"}>
          <button
            type="button"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold transition-colors hover:bg-[var(--ed-bg)]"
            style={{ borderColor: "var(--ed-line)", color: "var(--ed-ink)" }}
          >
            <LogOut className="size-4" />
            Sign out & stay here
          </button>
        </SignOutButton>
      </div>

      <div
        className="mt-5 rounded-xl border border-dashed p-3 text-[11px] leading-relaxed"
        style={{ borderColor: "var(--ed-line)", color: "var(--ed-mute)" }}
      >
        Tip: Clerk auto-redirects signed-in users away from{" "}
        <span className="font-mono">/sign-in</span> and{" "}
        <span className="font-mono">/sign-up</span>. Use{" "}
        <strong>Sign out &amp; stay here</strong> to test the flow as a new
        visitor.
      </div>
    </div>
  );
}
