"use client";

import { useState } from "react";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { GraduationCap, Building2, ArrowRight, Tag } from "lucide-react";

export function SignUpPanel({ refCode }: { refCode: string | null }) {
  const [role, setRole] = useState<"learner" | "institute">("learner");

  return (
    <div>
      <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--ed-ink)" }}>
        Create your account
      </h2>
      <p className="mt-1 text-sm" style={{ color: "var(--ed-mute)" }}>
        Takes less than 60 seconds. No credit card needed.
      </p>

      {/* Role selector */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {(
          [
            { id: "learner", label: "I'm a Learner", icon: GraduationCap },
            { id: "institute", label: "I'm an Institute", icon: Building2 },
          ] as const
        ).map((r) => {
          const active = role === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setRole(r.id)}
              className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-shadow"
              style={{
                borderColor: active ? "var(--ed-blue)" : "var(--ed-line)",
                boxShadow: active ? "0 0 0 2px var(--ed-blue)" : undefined,
                color: "var(--ed-ink)",
                background: "white",
              }}
            >
              <r.icon className="size-4" style={{ color: "var(--ed-blue)" }} />
              {r.label}
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
            <Building2 className="mx-auto size-8" style={{ color: "var(--ed-blue)" }} />
            <h3 className="mt-3 text-base font-bold" style={{ color: "var(--ed-ink)" }}>
              Onboard your institute
            </h3>
            <p className="mt-1 text-sm" style={{ color: "var(--ed-mute)" }}>
              Institutes set up via our guided 6-step wizard — plan, branding,
              first course and go live in ~20 minutes.
            </p>
            <Link
              href="/partner/onboard"
              className="mt-5 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white"
              style={{ background: "var(--ed-gradient)" }}
            >
              Start onboarding <ArrowRight className="size-4" />
            </Link>
            <p className="mt-3 text-[11px]" style={{ color: "var(--ed-mute)" }}>
              Already a partner?{" "}
              <Link href="/admin/login" className="font-semibold underline">
                Institute login
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
