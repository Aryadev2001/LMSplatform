"use client";

import Link from "next/link";
import { useUser, UserButton } from "@clerk/nextjs";
import { LayoutDashboard } from "lucide-react";

/**
 * Auth-aware nav cluster for the public marketplace header. Replaces the
 * always-on Login / Sign Up links: once Clerk reports a signed-in session we
 * show a Dashboard link (/post-login routes by role) + the account menu
 * instead. Rendered nothing until Clerk has loaded so we never flash
 * "Login / Sign Up" at an already-authenticated user.
 */
export function NavAuth() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    // Reserve space to avoid layout shift while Clerk hydrates.
    return <span className="inline-block h-9 w-9" aria-hidden />;
  }

  if (isSignedIn) {
    return (
      <>
        <Link
          href="/post-login"
          className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-[var(--ed-bg)]"
          style={{ color: "var(--ed-ink)" }}
        >
          <LayoutDashboard className="size-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>
        <UserButton appearance={{ elements: { avatarBox: "size-8" } }} />
      </>
    );
  }

  return (
    <>
      <Link
        href="/partner-program"
        className="hidden rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-[var(--ed-bg)] sm:block"
        style={{ color: "var(--ed-ink-2)" }}
      >
        Become a Partner
      </Link>
      <Link
        href="/sign-in"
        className="rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-[var(--ed-bg)]"
        style={{ color: "var(--ed-ink)" }}
      >
        Login
      </Link>
      <Link
        href="/sign-up"
        className="rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
        style={{ background: "var(--ed-gradient)" }}
      >
        Sign Up
      </Link>
    </>
  );
}
