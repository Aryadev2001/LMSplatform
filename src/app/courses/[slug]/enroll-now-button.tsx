"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTransition } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCart, type CartItem } from "@/lib/cart";

/**
 * The "Enroll now" CTA on /courses/[slug] is the single entry point into
 * the buying funnel. It branches on three pieces of server-resolved state
 * so anonymous, already-enrolled, free, and paid all land in the right
 * place — and so a signed-in student is NEVER asked to retype their email
 * (the ghost-account class of bug that left enrollments orphaned from
 * the buyer's dashboard).
 *
 *  - Anonymous → /sign-in?redirect_url=/courses/<slug> (returns here)
 *  - Already enrolled → /student/courses/<slug> ("Continue learning")
 *  - Application-only → keep the legacy /enroll funnel
 *  - Otherwise (free or paid, signed in) → add to cart + /checkout
 *
 * Funnelling free purchases through /checkout (instead of a bypass action)
 * keeps a single place where the profile + phone-OTP gates run, so the
 * same UX applies whether the user is buying a $0 starter or a paid
 * course.
 */
export function EnrollNowButton({
  isSignedIn,
  isStudent,
  alreadyEnrolled,
  requiresApplication,
  slug,
  item,
  ctaLabel,
}: {
  isSignedIn: boolean;
  isStudent: boolean;
  alreadyEnrolled: boolean;
  requiresApplication: boolean;
  slug: string;
  /** Cart payload — only used in the buy-flow branch. */
  item: CartItem;
  /** Optional label override ("Enroll now" / "Enroll free" / "Apply now"). */
  ctaLabel?: string;
}) {
  const router = useRouter();
  const { add, items } = useCart();
  const [pending, startTransition] = useTransition();

  // 1. Continue-learning (already paid + provisioned). Highest priority so
  // a signed-in returning learner sees the right state, not a "buy again".
  if (isSignedIn && isStudent && alreadyEnrolled) {
    return (
      <Link
        href={`/student/courses/${slug}`}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
        style={{ background: "var(--ed-green-dark, #4f7f1c)" }}
      >
        <CheckCircle2 className="size-4" />
        Continue learning
        <ArrowRight className="size-4" />
      </Link>
    );
  }

  // 2. Application-required programs stay on the legacy /enroll funnel
  // (which is designed for a qualification call, not a checkout).
  if (requiresApplication) {
    return (
      <Link
        href={`/enroll?course=${slug}`}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
        style={{ background: "var(--ed-gradient)" }}
      >
        {ctaLabel ?? "Apply now"}
        <ArrowRight className="size-4" />
      </Link>
    );
  }

  // 3. Anonymous → legacy /enroll funnel (one-form name+email → instant
  // magic-link account → course in dashboard). It's a much smoother shape
  // than a Clerk sign-up detour for a $0 starter or first-time visitor.
  // The legacy flow itself guards against signed-in users to avoid the
  // ghost-account hazard.
  if (!isSignedIn) {
    return (
      <Link
        href={`/enroll?course=${slug}`}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
        style={{ background: "var(--ed-gradient)" }}
      >
        {ctaLabel ?? "Enroll now"}
        <ArrowRight className="size-4" />
      </Link>
    );
  }

  // 4. Buy flow — add to cart (idempotent on programId), then push to
  // /checkout. The checkout page runs the profile + phone-OTP gates and
  // the price=0 path is handled there too.
  function enroll() {
    startTransition(() => {
      const inCart = items.some((i) => i.programId === item.programId);
      if (!inCart) {
        const added = add(item);
        if (!added) {
          toast.error("Could not add to cart — please try again.");
          return;
        }
      }
      router.push("/checkout");
    });
  }

  return (
    <button
      type="button"
      onClick={enroll}
      disabled={pending}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      style={{ background: "var(--ed-gradient)" }}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <>
          {ctaLabel ?? "Enroll now"}
          <ArrowRight className="size-4" />
        </>
      )}
    </button>
  );
}
