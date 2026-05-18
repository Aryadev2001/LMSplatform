"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  GraduationCap,
  Award,
  BookOpen,
  Building2,
  Globe,
  Sparkles,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { Ripple, TechOrbitDisplay } from "@/components/ui/modern-animated-sign-in";
import { EuroLogo } from "./euro-logo";

// Orbiting icons — lucide (per integration guideline #3; avoids next/image
// remote-domain config + external CDNs). Themed for a learning marketplace.
const orbit = (
  Icon: typeof GraduationCap,
  color: string,
  size: number,
) =>
  function IconCmp() {
    return (
      <span
        className="flex items-center justify-center rounded-full bg-white shadow-sm"
        style={{ width: size, height: size, color }}
      >
        <Icon style={{ width: size * 0.55, height: size * 0.55 }} />
      </span>
    );
  };

const iconsArray = [
  { component: orbit(GraduationCap, "var(--ed-blue)", 40), className: "size-[40px] border-none bg-transparent", radius: 100, duration: 20, delay: 20, path: false, reverse: false },
  { component: orbit(Award, "var(--ed-green-dark)", 40), className: "size-[40px] border-none bg-transparent", radius: 100, duration: 20, delay: 10, path: false, reverse: false },
  { component: orbit(BookOpen, "var(--ed-indigo)", 50), className: "size-[50px] border-none bg-transparent", radius: 210, duration: 20, path: false, reverse: false },
  { component: orbit(Building2, "var(--ed-teal)", 50), className: "size-[50px] border-none bg-transparent", radius: 210, duration: 20, delay: 20, path: false, reverse: false },
  { component: orbit(Globe, "var(--ed-blue)", 36), className: "size-[36px] border-none bg-transparent", radius: 150, duration: 20, delay: 20, path: false, reverse: true },
  { component: orbit(Sparkles, "var(--ed-warn)", 36), className: "size-[36px] border-none bg-transparent", radius: 150, duration: 20, delay: 10, path: false, reverse: true },
  { component: orbit(ShieldCheck, "var(--ed-green-dark)", 50), className: "size-[50px] border-none bg-transparent", radius: 270, duration: 20, path: false, reverse: true },
  { component: orbit(Trophy, "var(--ed-warn)", 50), className: "size-[50px] border-none bg-transparent", radius: 270, duration: 20, delay: 60, path: false, reverse: true },
  { component: orbit(Users, "var(--ed-pink)", 50), className: "size-[50px] border-none bg-transparent", radius: 320, duration: 20, delay: 20, path: false, reverse: false },
];

export function AnimatedAuth({
  tab,
  children,
}: {
  tab: "login" | "signup";
  children: ReactNode;
}) {
  return (
    <section className="flex min-h-[100dvh]" style={{ background: "var(--ed-bg)" }}>
      {/* Left — animated orbit panel */}
      <span className="relative hidden w-1/2 flex-col justify-center overflow-hidden lg:flex">
        <Ripple mainCircleSize={120} />
        <TechOrbitDisplay iconsArray={iconsArray} text="eurodigital" />
      </span>

      {/* Right — Clerk auth */}
      <span className="flex w-full flex-col items-center justify-center px-6 py-12 max-lg:px-[10%] lg:w-1/2">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 inline-block">
            <EuroLogo />
          </Link>

          <div
            className="mb-7 flex rounded-xl border p-1"
            style={{ borderColor: "var(--ed-line)", background: "white" }}
          >
            <Link
              href="/sign-in"
              className="flex-1 rounded-lg py-2 text-center text-sm font-bold transition-colors"
              style={
                tab === "login"
                  ? { background: "var(--ed-ink)", color: "white" }
                  : { color: "var(--ed-mute)" }
              }
            >
              Login
            </Link>
            <Link
              href="/sign-up"
              className="flex-1 rounded-lg py-2 text-center text-sm font-bold transition-colors"
              style={
                tab === "signup"
                  ? { background: "var(--ed-ink)", color: "white" }
                  : { color: "var(--ed-mute)" }
              }
            >
              Sign Up
            </Link>
          </div>

          {children}
        </div>
      </span>
    </section>
  );
}
