"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PartyPopper,
  Building2,
  Palette,
  BookOpen,
  CreditCard,
  Rocket,
  BadgeCheck,
} from "lucide-react";
import { submitPartnerOnboarding, checkSubdomain } from "./actions";

const PLANS = [
  {
    id: "basic" as const,
    name: "Basic",
    price: "$49/mo",
    feats: ["Up to 5 courses", "500 enrollments", "20% platform fee"],
  },
  {
    id: "standard" as const,
    name: "Standard",
    price: "$149/mo",
    feats: ["Up to 30 courses", "5,000 enrollments", "Custom subdomain", "12% platform fee"],
    recommended: true,
  },
  {
    id: "premium" as const,
    name: "Premium",
    price: "$399/mo",
    feats: ["Unlimited courses", "White-label", "API & SSO", "8% platform fee"],
  },
];

const STEPS = [
  { n: 1, label: "Plan", icon: BadgeCheck },
  { n: 2, label: "Business", icon: Building2 },
  { n: 3, label: "Branding", icon: Palette },
  { n: 4, label: "First Course", icon: BookOpen },
  { n: 5, label: "Payment", icon: CreditCard },
  { n: 6, label: "Go Live", icon: Rocket },
];

type State = {
  plan: "basic" | "standard" | "premium";
  instituteName: string;
  contactEmail: string;
  adminName: string;
  slug: string;
  tagline: string;
  brandPrimaryColor: string;
  brandSecondaryColor: string;
  logoUrl: string;
  licenseUrl: string;
  firstCourseTitle: string;
  firstCoursePrice: string;
};

const EMPTY: State = {
  plan: "standard",
  instituteName: "",
  contactEmail: "",
  adminName: "",
  slug: "",
  tagline: "",
  brandPrimaryColor: "#00aeef",
  brandSecondaryColor: "#8dc63f",
  logoUrl: "",
  licenseUrl: "",
  firstCourseTitle: "",
  firstCoursePrice: "",
};

const LS_KEY = "ed-partner-onboard";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 63);
}

export function OnboardWizard() {
  const [step, setStep] = useState(1);
  const [s, setS] = useState<State>(EMPTY);
  const [slugState, setSlugState] = useState<"idle" | "checking" | "ok" | "bad">("idle");
  const [slugMsg, setSlugMsg] = useState("");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<{ invited: boolean; slug: string } | null>(null);

  // Save & resume
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const j = JSON.parse(raw);
        if (j.s) setS({ ...EMPTY, ...j.s });
        if (j.step) setStep(j.step);
      }
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ s, step }));
    } catch {
      /* ignore */
    }
  }, [s, step]);

  function set<K extends keyof State>(k: K, v: State[K]) {
    setS((p) => ({ ...p, [k]: v }));
  }

  async function verifySlug(value: string) {
    const slug = slugify(value);
    set("slug", slug);
    if (slug.length < 2) {
      setSlugState("idle");
      return;
    }
    setSlugState("checking");
    const r = await checkSubdomain(slug);
    setSlugState(r.ok ? "ok" : "bad");
    setSlugMsg(r.ok ? "Available" : r.reason ?? "Unavailable");
  }

  const canNext = (() => {
    if (step === 1) return !!s.plan;
    if (step === 2) return s.instituteName.trim().length >= 2 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.contactEmail);
    if (step === 3) return slugState === "ok";
    return true;
  })();

  function submit() {
    startTransition(async () => {
      const r = await submitPartnerOnboarding({
        plan: s.plan,
        instituteName: s.instituteName,
        contactEmail: s.contactEmail,
        adminName: s.adminName,
        slug: s.slug,
        tagline: s.tagline,
        brandPrimaryColor: s.brandPrimaryColor,
        brandSecondaryColor: s.brandSecondaryColor,
        logoUrl: s.logoUrl,
        licenseUrl: s.licenseUrl,
        firstCourseTitle: s.firstCourseTitle,
        firstCoursePriceCents: s.firstCoursePrice
          ? Math.round(Number(s.firstCoursePrice) * 100)
          : undefined,
      });
      if (r.success) {
        localStorage.removeItem(LS_KEY);
        setDone({ invited: r.invited, slug: r.slug });
      } else {
        toast.error(r.error);
      }
    });
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border bg-white p-10 text-center shadow-sm" style={{ borderColor: "var(--ed-line)" }}>
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl text-white" style={{ background: "var(--ed-gradient)" }}>
          <PartyPopper className="size-7" />
        </div>
        <h2 className="mt-5 text-2xl font-extrabold" style={{ color: "var(--ed-ink)" }}>
          You&apos;re on eurodigital.coach!
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--ed-mute)" }}>
          {done.invited
            ? `We emailed an admin invite to ${s.contactEmail}. Click the magic link to access your institute dashboard.`
            : `Your account already exists — sign in to access your institute dashboard.`}
        </p>
        <p className="mt-3 rounded-xl border px-3 py-2 text-xs" style={{ borderColor: "var(--ed-line)", color: "var(--ed-ink-2)" }}>
          Your storefront: <strong>{done.slug}</strong>.eurodigital.coach · status:{" "}
          <strong>under review</strong> — our team activates verified institutes.
        </p>
        <a
          href="/admin/login"
          className="mt-6 inline-flex rounded-xl px-6 py-3 text-sm font-bold text-white"
          style={{ background: "var(--ed-gradient)" }}
        >
          Go to institute login
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Stepper */}
      <div className="mb-8 flex items-center justify-between">
        {STEPS.map((st, i) => {
          const active = st.n === step;
          const complete = st.n < step;
          return (
            <div key={st.n} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className="flex size-9 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    background: active || complete ? "var(--ed-gradient)" : "white",
                    color: active || complete ? "white" : "var(--ed-mute)",
                    border: active || complete ? "none" : "1px solid var(--ed-line)",
                  }}
                >
                  {complete ? <Check className="size-4" /> : <st.icon className="size-4" />}
                </div>
                <span className="hidden text-[10px] font-semibold sm:block" style={{ color: active ? "var(--ed-ink)" : "var(--ed-mute)" }}>
                  {st.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="mx-1 h-0.5 flex-1" style={{ background: complete ? "var(--ed-green)" : "var(--ed-line)" }} />
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl border bg-white p-8 shadow-sm" style={{ borderColor: "var(--ed-line)" }}>
        {/* Step 1 — Plan */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: "var(--ed-ink)" }}>Choose your plan</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--ed-mute)" }}>You can change this later.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {PLANS.map((p) => {
                const sel = s.plan === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => set("plan", p.id)}
                    className="relative rounded-2xl border p-5 text-left transition-shadow hover:shadow-md"
                    style={{
                      borderColor: sel ? "var(--ed-blue)" : "var(--ed-line)",
                      boxShadow: sel ? "0 0 0 2px var(--ed-blue)" : undefined,
                    }}
                  >
                    {p.recommended && (
                      <span className="absolute -top-2 left-4 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: "var(--ed-green-dark)" }}>
                        RECOMMENDED
                      </span>
                    )}
                    <div className="text-sm font-bold" style={{ color: "var(--ed-ink)" }}>{p.name}</div>
                    <div className="mt-1 text-2xl font-extrabold" style={{ color: "var(--ed-ink)" }}>{p.price}</div>
                    <ul className="mt-3 space-y-1.5">
                      {p.feats.map((f) => (
                        <li key={f} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--ed-ink-2)" }}>
                          <Check className="size-3.5 shrink-0" style={{ color: "var(--ed-green)" }} /> {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2 — Business */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold" style={{ color: "var(--ed-ink)" }}>About your institute</h2>
            <Field label="Institute name">
              <input className="ed-input" value={s.instituteName} onChange={(e) => {
                set("instituteName", e.target.value);
                if (!s.slug) verifySlug(e.target.value);
              }} placeholder="Acme Coaching Academy" />
            </Field>
            <Field label="Contact / admin email">
              <input type="email" className="ed-input" value={s.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="owner@acme.com" />
            </Field>
            <Field label="Admin name (optional)">
              <input className="ed-input" value={s.adminName} onChange={(e) => set("adminName", e.target.value)} placeholder="Jane Doe" />
            </Field>
            <Field label="Trade license URL (optional — KYC)">
              <input className="ed-input" value={s.licenseUrl} onChange={(e) => set("licenseUrl", e.target.value)} placeholder="https://… (file upload available in your dashboard)" />
            </Field>
            <p className="text-[11px]" style={{ color: "var(--ed-mute)" }}>
              KYC documents are verified by our team before your storefront goes live.
            </p>
          </div>
        )}

        {/* Step 3 — Branding */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold" style={{ color: "var(--ed-ink)" }}>Branding & subdomain</h2>
            <Field label="Subdomain">
              <div className="flex items-center gap-2">
                <input className="ed-input font-mono" value={s.slug} onChange={(e) => verifySlug(e.target.value)} placeholder="acme" />
                <span className="text-xs" style={{ color: "var(--ed-mute)" }}>.eurodigital.coach</span>
              </div>
              <span className="mt-1 block text-xs font-semibold" style={{
                color: slugState === "ok" ? "var(--ed-green-dark)" : slugState === "bad" ? "var(--ed-rose)" : "var(--ed-mute)",
              }}>
                {slugState === "checking" ? "Checking…" : slugState !== "idle" ? slugMsg : " "}
              </span>
            </Field>
            <Field label="Tagline (optional)">
              <input className="ed-input" value={s.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="Industry-ready skills, taught by experts" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Primary color">
                <input type="color" value={s.brandPrimaryColor} onChange={(e) => set("brandPrimaryColor", e.target.value)} className="h-10 w-full rounded-xl border" style={{ borderColor: "var(--ed-line)" }} />
              </Field>
              <Field label="Secondary color">
                <input type="color" value={s.brandSecondaryColor} onChange={(e) => set("brandSecondaryColor", e.target.value)} className="h-10 w-full rounded-xl border" style={{ borderColor: "var(--ed-line)" }} />
              </Field>
            </div>
            <Field label="Logo URL (optional — upload in dashboard later)">
              <input className="ed-input" value={s.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://…" />
            </Field>
          </div>
        )}

        {/* Step 4 — First course */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold" style={{ color: "var(--ed-ink)" }}>Your first course (optional)</h2>
            <p className="text-sm" style={{ color: "var(--ed-mute)" }}>
              We&apos;ll create it as a draft — add modules & lessons from your dashboard.
            </p>
            <Field label="Course title">
              <input className="ed-input" value={s.firstCourseTitle} onChange={(e) => set("firstCourseTitle", e.target.value)} placeholder="Cloud Practitioner Foundations" />
            </Field>
            <Field label="Price (USD)">
              <input type="number" min={0} className="ed-input" value={s.firstCoursePrice} onChange={(e) => set("firstCoursePrice", e.target.value)} placeholder="49" />
            </Field>
          </div>
        )}

        {/* Step 5 — Payment */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold" style={{ color: "var(--ed-ink)" }}>Subscription & payouts</h2>
            <div className="rounded-2xl border p-5" style={{ borderColor: "var(--ed-line)" }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: "var(--ed-ink)" }}>
                  {PLANS.find((p) => p.id === s.plan)?.name} plan
                </span>
                <span className="text-lg font-extrabold" style={{ color: "var(--ed-ink)" }}>
                  {PLANS.find((p) => p.id === s.plan)?.price}
                </span>
              </div>
            </div>
            <div className="rounded-xl border px-4 py-3 text-xs" style={{ borderColor: "var(--ed-line)", color: "var(--ed-ink-2)" }}>
              Subscription billing &amp; bank-payout setup are completed inside
              your institute dashboard after our team verifies your KYC — you
              connect your own Stripe/Razorpay there to receive student
              payments directly. No card is charged now.
            </div>
          </div>
        )}

        {/* Step 6 — Go live */}
        {step === 6 && (
          <div className="space-y-4">
            <h2 className="text-xl font-extrabold" style={{ color: "var(--ed-ink)" }}>Review & go live</h2>
            <dl className="divide-y rounded-2xl border" style={{ borderColor: "var(--ed-line)" }}>
              {[
                ["Plan", PLANS.find((p) => p.id === s.plan)?.name],
                ["Institute", s.instituteName],
                ["Admin email", s.contactEmail],
                ["Storefront", `${s.slug}.eurodigital.coach`],
                ["First course", s.firstCourseTitle || "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between px-4 py-3 text-sm">
                  <dt style={{ color: "var(--ed-mute)" }}>{k}</dt>
                  <dd className="font-semibold" style={{ color: "var(--ed-ink)" }}>{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-[11px]" style={{ color: "var(--ed-mute)" }}>
              Submitting creates your institute (under review) and emails your
              admin invite. Our team activates verified institutes on the
              marketplace.
            </p>
          </div>
        )}

        {/* Nav */}
        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            disabled={step === 1 || pending}
            onClick={() => setStep((x) => Math.max(1, x - 1))}
            className="inline-flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40"
            style={{ color: "var(--ed-ink-2)" }}
          >
            <ChevronLeft className="size-4" /> Back
          </button>
          {step < 6 ? (
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setStep((x) => Math.min(6, x + 1))}
              className="inline-flex items-center gap-1 rounded-xl px-6 py-2.5 text-sm font-bold text-white disabled:opacity-40"
              style={{ background: "var(--ed-gradient)" }}
            >
              Continue <ChevronRight className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={submit}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              style={{ background: "var(--ed-gradient)" }}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Go live
            </button>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-xs" style={{ color: "var(--ed-mute)" }}>
        Progress is saved automatically — you can close and resume anytime.
      </p>

      <style>{`.ed-input{height:2.5rem;width:100%;border-radius:0.75rem;border:1px solid var(--ed-line);padding:0 0.75rem;font-size:0.875rem;outline:none;background:white}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ed-ink-2)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}
