import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { Brand } from "@/components/brand";

export default function ForbiddenPage() {
  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="absolute inset-0 -z-10 bg-grid-soft" />

      <Link href="/" className="absolute left-6 top-6">
        <Brand />
      </Link>

      <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-card text-destructive shadow-card">
        <ShieldAlert className="size-6" />
      </div>
      <div className="mt-6 max-w-md space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          — 403 · Access denied
        </div>
        <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
          You don&apos;t have access to this area
        </h1>
        <p className="text-muted-foreground">
          If you think this is a mistake, contact your administrator. Otherwise, head back home.
        </p>
      </div>
      <div className="mt-8 flex gap-2">
        <Link href="/" className={buttonVariants({ size: "lg", className: "h-11 px-6" })}>
          Back to home
        </Link>
        <Link
          href="/post-login"
          className={buttonVariants({ variant: "outline", size: "lg", className: "h-11 px-6" })}
        >
          My dashboard
        </Link>
      </div>
    </div>
  );
}
