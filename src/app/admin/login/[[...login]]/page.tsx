import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { Brand } from "@/components/brand";
import { ShieldCheck, Lock } from "lucide-react";

export const metadata = {
  title: "Admin Console — EDT",
  description: "Restricted access. Authorized administrators only.",
  robots: "noindex, nofollow",
};

export default function AdminLoginPage() {
  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-secondary/30 px-6 py-12">
      <div className="absolute inset-0 -z-10 bg-grid-soft" />

      {/* Brand */}
      <Link href="/" className="mb-8">
        <Brand />
      </Link>

      {/* Card */}
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl bg-card p-8 shadow-soft">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-foreground text-background">
              <ShieldCheck className="size-5" />
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Admin console
            </div>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in with your authorized admin email.
            </p>
          </div>

          <div className="admin-clerk flex justify-center">
            <SignIn
              routing="path"
              path="/admin/login"
              forceRedirectUrl="/post-login"
              fallbackRedirectUrl="/post-login"
            />
          </div>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Lock className="size-3" />
          Allowlist enforced — only authorized emails accepted
        </p>

        <div className="mt-3 flex items-center justify-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-foreground">
            Public site
          </Link>
          <span className="inline-block size-1 rounded-full bg-muted-foreground/40" />
          <Link href="/sign-in" className="transition-colors hover:text-foreground">
            Coach / Student sign-in
          </Link>
        </div>
      </div>
    </div>
  );
}
