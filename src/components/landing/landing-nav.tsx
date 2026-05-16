"use client";

import Link from "next/link";
import { Brand } from "@/components/brand";
import { buttonVariants } from "@/components/ui/button";
import { Show, UserButton } from "@clerk/nextjs";
import { motion } from "motion/react";

export function LandingNav() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 mx-auto mt-4 max-w-6xl px-4"
    >
      <div className="flex h-14 items-center justify-between rounded-2xl border border-black/5 bg-background/70 px-4 shadow-soft backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/60">
        <Link href="/" className="flex items-center">
          <Brand />
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#how" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#programs" className="transition-colors hover:text-foreground">
            Programs
          </a>
          <Link href="/diagnostic" className="transition-colors hover:text-foreground">
            Business X-Ray
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Show when="signed-out">
            <Link href="/sign-in" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Sign in
            </Link>
            <Link
              href="/diagnostic"
              className={buttonVariants({
                size: "sm",
                className: "bg-brand-gradient font-semibold text-white hover:opacity-95",
              })}
            >
              Take the X-Ray
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              href="/post-login"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Dashboard
            </Link>
            <UserButton />
          </Show>
        </div>
      </div>
    </motion.header>
  );
}
