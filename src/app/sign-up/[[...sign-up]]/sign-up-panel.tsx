"use client";

import { useState } from "react";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import {
  GraduationCap,
  Building2,
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
    id: "basic_partner",
    label: "Partner — Basic",
    sub: "Publish free courses (upgrade later)",
    icon: Building2,
  },
] as const;

export function SignUpPanel({ refCode }: { refCode: string | null }) {
  const [role, setRole] = useState<"learner" | "basic_partner">("learner");

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
          <div>
            <div
              className="mb-5 rounded-xl border px-4 py-3 text-[12px]"
              style={{
                borderColor: "var(--ed-line)",
                background: "rgba(0,174,239,0.06)",
                color: "var(--ed-ink-2)",
              }}
            >
              You&apos;re signing up as a <strong>Basic Partner</strong>{" "}
              (free). You&apos;ll get a personal page where you can publish{" "}
              <strong>free</strong> courses to the marketplace. Upgrade to{" "}
              <Link
                href="/partner-program"
                className="font-semibold underline underline-offset-2"
              >
                Standard or Premium
              </Link>{" "}
              to publish paid courses and unlock advanced features.
            </div>
            <div className="euro-clerk">
              <SignUp
                appearance={clerkAppearance}
                routing="path"
                path="/sign-up"
                signInUrl="/sign-in"
                forceRedirectUrl="/post-login"
                fallbackRedirectUrl="/post-login"
                unsafeMetadata={{ role: "basic_partner" }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
