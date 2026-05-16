import Link from "next/link";
import { Brand } from "@/components/brand";

export function LandingFooter() {
  return (
    <footer className="border-t border-black/5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 md:flex-row md:items-center">
        <div className="flex flex-col gap-2">
          <Brand full />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Euro Digital Technologies L.L.C. All rights reserved.
          </p>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/diagnostic" className="transition-colors hover:text-foreground">
            Business X-Ray
          </Link>
          <Link href="/sign-in" className="transition-colors hover:text-foreground">
            Sign in
          </Link>
          <a href="#how" className="transition-colors hover:text-foreground">
            How it works
          </a>
        </div>
      </div>
    </footer>
  );
}
