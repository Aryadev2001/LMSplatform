"use client";

import { useState } from "react";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import {
  GraduationCap,
  Building2,
  ArrowRight,
  Tag,
  Check,
} from "lucide-react";
import { clerkAppearance } from "@/components/euro/clerk-appearance";

const ROLES = [
  {
    id: "learner",
    label: "Learner",
    sub: "Take courses & get certified",
    icon: GraduationCap,
  },
  {
    id: "institute",
    label: "Institute",
    sub: "Sell courses to students",
    icon: Building2,
  },
] as const;

export function SignUpPanel({ refCode }: { refCode: string | null }) {
  const [role, setRole] = useState<"learner" | "institute">("learner");

  return (
    <div>
      <h2
        className="font-display text-[26px] leading-tight tracking-tight"
        style={{ color: "var(--ed-ink)" }}
      >
        Create your account
      </h2>
      <p className="mt-1.5 text-sm" style={{ color: "var(--ed-mute)" }}>
        Choose how you want to use eurodigital.coach.
      </p>

      {/* Role selector */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        {ROLES.map((r) => {
          const active = role === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setRole(r.id)}
              aria-pressed={active}
              className="relative flex flex-col gap-2 rounded-2xl border p-4 text-left transition-all"
              style={{
                borderColor: active ? "var(--ed-blue)" : "var(--ed-line)",
                background: active ? "rgba(0,174,239,0.05)" : "white",
                boxShadow: active
                  ? "0 0 0 3px rgba(0,174,239,0.15)"
                  : undefined,
              }}
            >
              <span
                className="flex size-9 items-center justify-center rounded-xl"
                style={{
                  background: active ? "var(--ed-blue)" : "var(--ed-bg)",
                }}
              >
                <r.icon
                  className="size-4"
                  style={{ color: active ? "white" : "var(--ed-mute)" }}
                />
              </span>
              <span>
                <span
                  className="block text-sm font-bold"
                  style={{ color: "var(--ed-ink)" }}
                >
                  {r.label}
                </span>
                <span
                  className="block text-[12px]"
                  style={{ color: "var(--ed-mute)" }}
                >
                  {r.sub}
                </span>
              </span>
              {active && (
                <span
                  className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full"
                  style={{ background: "var(--ed-blue)" }}
                >
                  <Check className="size-3 text-white" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {refCode && (
        <div
          className="mt-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold"
          style={{
            borderColor: "var(--ed-green)",
            background: "rgba(141,198,63,0.10)",
            color: "var(--ed-green-dark)",
          }}
        >
          <Tag className="size-3.5" />
          Referral code <span className="font-mono">{refCode}</span> applied
        </div>
      )}

      <div className="mt-6">
        {role === "learner" ? (
          <div className="euro-clerk">
            <SignUp
              appearance={clerkAppearance}
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
              forceRedirectUrl="/post-login"
              fallbackRedirectUrl="/post-login"
            />
          </div>
        ) : (
          <div
            className="rounded-2xl border p-6 text-center"
            style={{ borderColor: "var(--ed-line)", background: "white" }}
          >
            <span
              className="mx-auto flex size-11 items-center justify-center rounded-2xl"
              style={{ background: "var(--ed-bg)" }}
            >
              <Building2
                className="size-5"
                style={{ color: "var(--ed-blue)" }}
              />
            </span>
            <h3
              className="mt-3 text-base font-bold"
              style={{ color: "var(--ed-ink)" }}
            >
              Partner access is invite-only
            </h3>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--ed-mute)" }}
            >
              Tell us about your institute and we&apos;ll review and email your
              dashboard login details.
            </p>
            <Link
              href="/contact"
              className="mt-5 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--ed-gradient)" }}
            >
              Apply to join <ArrowRight className="size-4" />
            </Link>
            <p
              className="mt-3 text-[11px]"
              style={{ color: "var(--ed-mute)" }}
            >
              Already a partner?{" "}
              <Link
                href="/admin/login"
                className="font-semibold underline underline-offset-2"
              >
                Institute login
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
