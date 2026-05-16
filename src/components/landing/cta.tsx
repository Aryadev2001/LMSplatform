"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function CallToAction() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative isolate overflow-hidden rounded-3xl bg-foreground p-10 text-background md:p-20"
        >
          <div className="absolute inset-0 -z-10 opacity-[0.04]">
            <svg className="size-full" xmlns="http://www.w3.org/2000/svg">
              <pattern id="dot-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="currentColor" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#dot-pattern)" />
            </svg>
          </div>
          <div className="max-w-2xl">
            <div className="mb-3 text-xs uppercase tracking-widest text-background/60">
              — Stop guessing
            </div>
            <h2 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Know your{" "}
              <span className="text-brand-gradient">#1 bottleneck</span> in 7 minutes
            </h2>
            <p className="mt-5 max-w-md text-base text-background/70 md:text-lg">
              Free. No signup to see results. A scored report and a personalised roadmap, instantly.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/diagnostic"
                className={buttonVariants({
                  size: "lg",
                  className:
                    "group h-12 bg-brand-gradient px-7 text-sm font-semibold text-white hover:opacity-95",
                })}
              >
                Take the Business X-Ray
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/sign-in"
                className={buttonVariants({
                  variant: "ghost",
                  size: "lg",
                  className:
                    "h-12 px-6 text-sm text-background hover:bg-background/10 hover:text-background",
                })}
              >
                Student sign in
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
