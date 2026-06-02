"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { placeBundleOrder } from "./actions";

export function EnrollBundleButton({
  slug,
  isSignedIn,
  ctaLabel,
}: {
  slug: string;
  isSignedIn: boolean;
  ctaLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function go() {
    if (!isSignedIn) {
      router.push(`/sign-up?redirect_url=${encodeURIComponent(`/bundles/${slug}`)}`);
      return;
    }
    startTransition(async () => {
      const r = await placeBundleOrder(slug);
      if (r.ok) {
        toast.success("You're enrolled in the whole bundle 🎉");
        router.push("/student/courses");
      } else if (r.needsProfile) {
        router.push(r.needsProfile);
      } else {
        toast.error(r.error ?? "Could not complete enrollment.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={pending}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      style={{ background: "var(--ed-gradient)" }}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <>
          {ctaLabel}
          <ArrowRight className="size-4" />
        </>
      )}
    </button>
  );
}
