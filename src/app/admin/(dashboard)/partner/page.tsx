import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { tenants } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Megaphone,
  UserSquare2,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  Lock,
} from "lucide-react";
import { TIER_LABEL, type PartnerTier } from "@/lib/tier-lock";

export const dynamic = "force-dynamic";

export const metadata = { title: "Partner overview — eurodigital.coach" };

const TIER_BLURB = {
  basic: "Free courses only. Upgrade to publish paid courses.",
  standard: "Paid courses, exam Q-bank, certificates, vouchers.",
  premium: "Everything in Standard + custom domain + priority support.",
} as const;

export default async function PartnerOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ locked?: string; min?: string }>;
}) {
  await requireRole("admin");
  const tenantId = await requireTenantId();
  const { locked, min } = await searchParams;

  const [row] = await db
    .select({
      name: tenants.name,
      logoUrl: tenants.logoUrl,
      tier: tenants.tier,
      billingStatus: tenants.billingStatus,
      businessLegalName: tenants.businessLegalName,
      businessAddressLine1: tenants.businessAddressLine1,
      companyProfile: tenants.companyProfile,
      ownerName: tenants.ownerName,
      ownerProfile: tenants.ownerProfile,
      ownerPhotoUrl: tenants.ownerPhotoUrl,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const businessDone = Boolean(
    row?.businessLegalName && row?.businessAddressLine1,
  );
  const brandingDone = Boolean(row?.companyProfile);
  const ownerDone = Boolean(row?.ownerName && row?.ownerProfile != null);
  const completed = [businessDone, brandingDone, ownerDone].filter(Boolean)
    .length;

  const tier = row?.tier ?? "basic";

  const steps = [
    {
      key: "business",
      label: "Business registration",
      icon: Building2,
      done: businessDone,
    },
    {
      key: "branding",
      label: "Branding & company profile",
      icon: Megaphone,
      done: brandingDone,
    },
    {
      key: "owner",
      label: "Owner / primary contact",
      icon: UserSquare2,
      done: ownerDone,
    },
  ];

  const lockedMin = (min ?? "standard") as PartnerTier;
  const lockedMinLabel = TIER_LABEL[lockedMin] ?? "Standard";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Partner overview"
        description="Your current plan, your storefront profile, and what's left to complete."
      />

      {/* Upgrade-nudge banner when the user arrived via requireTier() redirect */}
      {locked && (
        <div
          className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between"
          style={{
            borderColor: "rgba(0,174,239,0.3)",
            background: "rgba(0,174,239,0.08)",
          }}
        >
          <div className="flex items-start gap-3">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "var(--ed-blue)" }}
            >
              <Lock className="size-4 text-white" />
            </span>
            <div>
              <div className="text-sm font-bold" style={{ color: "var(--ed-ink)" }}>
                {locked} is a {lockedMinLabel}-tier feature
              </div>
              <div className="mt-0.5 text-xs" style={{ color: "var(--ed-ink-2)" }}>
                Upgrade your partner plan to unlock {locked.toLowerCase()} and
                the rest of the {lockedMinLabel} toolkit.
              </div>
            </div>
          </div>
          <Link
            href="/partner-program"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--ed-gradient)" }}
          >
            See upgrade options <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}

      {/* Tier card */}
      <Card className="overflow-hidden">
        <div
          className="border-b p-6"
          style={{ background: "var(--ed-ink)", color: "white" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-white/65">
                Current plan
              </div>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-2xl font-extrabold">
                  {TIER_LABEL[tier]}
                </span>
                <Badge
                  variant="secondary"
                  className="bg-white/15 text-[10px] uppercase tracking-wider text-white"
                >
                  {row?.billingStatus ?? "none"}
                </Badge>
              </div>
              <p className="mt-2 max-w-md text-sm text-white/70">
                {TIER_BLURB[tier]}
              </p>
            </div>
            {tier !== "premium" && (
              <Link
                href="/partner-program"
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--ed-gradient)" }}
              >
                <Sparkles className="size-4" />
                See upgrade options
              </Link>
            )}
          </div>
        </div>
      </Card>

      {/* Onboarding progress */}
      <Card>
        <CardHeader>
          <div className="flex items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base">Onboarding progress</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {completed} of {steps.length} sections complete
              </p>
            </div>
            <Link
              href="/admin/partner/onboard"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--ed-ink)] px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
            >
              {completed === 0
                ? "Start setup"
                : completed === steps.length
                  ? "Review profile"
                  : "Continue setup"}
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(completed / steps.length) * 100}%`,
                background: "var(--ed-gradient)",
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {steps.map((s) => (
              <li key={s.key} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span
                    className="flex size-9 items-center justify-center rounded-xl"
                    style={{
                      background: s.done
                        ? "rgba(141,198,63,0.15)"
                        : "var(--ed-bg)",
                    }}
                  >
                    <s.icon
                      className="size-4"
                      style={{
                        color: s.done
                          ? "var(--ed-green)"
                          : "var(--ed-mute)",
                      }}
                    />
                  </span>
                  <span className="text-sm font-semibold">{s.label}</span>
                </div>
                {s.done ? (
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: "var(--ed-green)" }}
                  >
                    <CheckCircle2 className="size-4" /> Complete
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Circle className="size-4" /> Pending
                  </span>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Storefront preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your storefront</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            What learners see on your public marketplace page.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 rounded-2xl border p-4">
            <div className="flex size-14 items-center justify-center overflow-hidden rounded-xl border bg-secondary/40">
              {row?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.logoUrl}
                  alt={row.name}
                  className="size-full object-contain"
                />
              ) : (
                <span className="text-[10px] text-muted-foreground">No logo</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">
                {row?.name ?? "—"}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {row?.ownerName ? `Led by ${row.ownerName}` : "Owner not set"}
              </div>
            </div>
            <Link
              href={`/institute/${tenantId}`}
              className="hidden text-xs font-semibold underline-offset-2 hover:underline sm:inline"
              style={{ color: "var(--ed-blue)" }}
            >
              View public page →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
