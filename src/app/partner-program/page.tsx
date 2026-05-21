import Link from "next/link";
import { Check, X, Sparkles, Building2, Award } from "lucide-react";
import { EuroNav } from "@/components/euro/euro-nav";
import { EuroFooter } from "@/components/euro/euro-footer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Partner Program — eurodigital.coach",
  description:
    "Three tiers — Basic (free), Standard, Premium. Publish courses on the eurodigital.coach marketplace, take payments through your own gateway, and grow your brand.",
};

type TierCell = boolean | string | number;

interface Tier {
  id: "basic" | "standard" | "premium";
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  cta: { label: string; href: string };
  highlighted?: boolean;
  icon: typeof Sparkles;
}

const TIERS: Tier[] = [
  {
    id: "basic",
    name: "Basic",
    price: "$0",
    cadence: "free forever",
    blurb:
      "Publish free courses, get a branded marketplace page, build your audience.",
    cta: { label: "Start free", href: "/sign-up" },
    icon: Sparkles,
  },
  {
    id: "standard",
    name: "Standard",
    price: "$49",
    cadence: "per month",
    blurb:
      "Sell paid courses, take payments through your own Stripe/Razorpay, add modules & exams.",
    cta: { label: "Upgrade to Standard", href: "/admin/partner/billing" },
    highlighted: true,
    icon: Building2,
  },
  {
    id: "premium",
    name: "Premium",
    price: "$149",
    cadence: "per month",
    blurb:
      "Everything in Standard + custom domain, certificates, referral discounts, vouchers, and priority support.",
    cta: { label: "Upgrade to Premium", href: "/admin/partner/billing" },
    icon: Award,
  },
];

interface FeatureRow {
  label: string;
  values: [TierCell, TierCell, TierCell];
  group?: boolean;
}

const FEATURES: FeatureRow[] = [
  { label: "Course catalog", group: true, values: ["", "", ""] },
  { label: "Free courses", values: [true, true, true] },
  { label: "Paid courses", values: [false, true, true] },
  { label: "Courses per partner", values: ["Unlimited", "Unlimited", "Unlimited"] },
  { label: "Course modules", values: [true, true, true] },
  { label: "Module videos (intro / workshop)", values: [true, true, true] },
  { label: "Exam Q-Bank & marks", values: [false, true, true] },
  { label: "Course certificates", values: [false, true, true] },

  { label: "Branding & profile", group: true, values: ["", "", ""] },
  { label: "Branded marketplace page", values: [true, true, true] },
  { label: "Owner & company profile", values: [true, true, true] },
  { label: "Logo, colors & social links", values: [true, true, true] },
  { label: "Custom subdomain (you.eurodigital.coach)", values: [false, true, true] },
  { label: "Own custom domain", values: [false, false, true] },

  { label: "Payments & offers", group: true, values: ["", "", ""] },
  { label: "Connect your own Stripe / Razorpay", values: [false, true, true] },
  { label: "Per-course voucher codes", values: [false, true, true] },
  { label: "Referral discount points", values: [false, true, true] },
  { label: "Reward percentages on enrollment", values: [false, true, true] },

  { label: "Support & visibility", group: true, values: ["", "", ""] },
  { label: "Featured slot on home page", values: [false, false, true] },
  { label: "Email support", values: ["Community", "48h", "Priority"] },
  { label: "Onboarding call", values: [false, false, true] },
];

function CellValue({ v }: { v: TierCell }) {
  if (v === true)
    return <Check className="size-4" style={{ color: "var(--ed-green)" }} />;
  if (v === false)
    return <X className="size-4" style={{ color: "var(--ed-mute)" }} />;
  if (v === "") return null;
  return (
    <span className="text-xs font-semibold" style={{ color: "var(--ed-ink-2)" }}>
      {v}
    </span>
  );
}

export default function PartnerProgramPage() {
  return (
    <div style={{ background: "var(--ed-bg)" }} className="min-h-screen">
      <EuroNav />

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ background: "var(--ed-ink)" }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{ background: "var(--ed-halftone)" }}
        />
        <div className="relative mx-auto max-w-5xl px-6 py-20 text-center md:py-28">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest"
            style={{
              background: "rgba(141,198,63,0.12)",
              border: "1px solid rgba(141,198,63,0.35)",
              color: "var(--ed-green)",
            }}
          >
            Partner Program
          </span>
          <h1 className="font-display mt-6 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-white md:text-6xl">
            Choose how you teach on{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #1AADE0 0%, #8CC63F 100%)",
              }}
            >
              eurodigital.coach
            </span>
            .
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-base leading-relaxed text-white/70">
            Three tiers, no surprises. Start free with Basic, upgrade when you
            sell, and unlock the full platform with Premium.
          </p>
        </div>
      </section>

      {/* Tier cards */}
      <section className="mx-auto -mt-12 max-w-6xl px-6">
        <div className="grid gap-5 md:grid-cols-3">
          {TIERS.map((t, i) => (
            <div
              key={t.id}
              className={`relative flex flex-col rounded-3xl border bg-white p-6 shadow-xl ${
                t.highlighted ? "ring-2" : ""
              }`}
              style={{
                borderColor: "var(--ed-line)",
                ...(t.highlighted
                  ? ({ "--tw-ring-color": "var(--ed-blue)" } as React.CSSProperties)
                  : {}),
              }}
            >
              {t.highlighted && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white"
                  style={{ background: "var(--ed-blue)" }}
                >
                  Most popular
                </span>
              )}
              <div
                className="mb-4 flex size-11 items-center justify-center rounded-xl text-white"
                style={{
                  background:
                    i === 0
                      ? "var(--ed-green)"
                      : i === 1
                        ? "var(--ed-blue)"
                        : "var(--ed-ink)",
                }}
              >
                <t.icon className="size-5" />
              </div>
              <div className="text-lg font-extrabold" style={{ color: "var(--ed-ink)" }}>
                {t.name}
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold" style={{ color: "var(--ed-ink)" }}>
                  {t.price}
                </span>
                <span className="text-xs" style={{ color: "var(--ed-mute)" }}>
                  {t.cadence}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--ed-mute)" }}>
                {t.blurb}
              </p>
              <Link
                href={t.cta.href}
                className="mt-6 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{
                  background: t.highlighted
                    ? "var(--ed-gradient)"
                    : "var(--ed-ink)",
                }}
              >
                {t.cta.label}
              </Link>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className="my-16">
          <h2 className="mb-6 text-2xl font-extrabold tracking-tight" style={{ color: "var(--ed-ink)" }}>
            Compare what&apos;s in each tier
          </h2>
          <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "var(--ed-line)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--ed-bg)" }}>
                  <th className="w-1/2 px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--ed-mute)" }}>
                    Feature
                  </th>
                  {TIERS.map((t) => (
                    <th
                      key={t.id}
                      className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-widest"
                      style={{ color: "var(--ed-mute)" }}
                    >
                      {t.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((row, i) =>
                  row.group ? (
                    <tr key={i} style={{ background: "var(--ed-bg)" }}>
                      <td
                        colSpan={4}
                        className="px-5 py-2 text-[11px] font-extrabold uppercase tracking-widest"
                        style={{ color: "var(--ed-ink-2)" }}
                      >
                        {row.label}
                      </td>
                    </tr>
                  ) : (
                    <tr key={i} className="border-t" style={{ borderColor: "var(--ed-line)" }}>
                      <td className="px-5 py-3" style={{ color: "var(--ed-ink-2)" }}>
                        {row.label}
                      </td>
                      {row.values.map((v, j) => (
                        <td key={j} className="px-5 py-3 text-center">
                          <span className="inline-flex items-center justify-center">
                            <CellValue v={v} />
                          </span>
                        </td>
                      ))}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom CTA */}
        <div
          className="mb-16 rounded-3xl p-10 text-center text-white md:p-14"
          style={{ background: "var(--ed-ink)" }}
        >
          <h3 className="text-2xl font-extrabold md:text-3xl">
            Ready to teach on eurodigital.coach?
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
            Sign up for Basic in under a minute — no credit card. Upgrade to
            Standard or Premium any time from your partner dashboard.
          </p>
          <Link
            href="/sign-up"
            className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--ed-gradient)" }}
          >
            Create your Basic partner account
          </Link>
        </div>
      </section>

      <EuroFooter />
    </div>
  );
}
