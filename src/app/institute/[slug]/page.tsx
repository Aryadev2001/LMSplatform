import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import {
  BookOpen,
  Users,
  CalendarDays,
  Tag,
  GraduationCap,
  LogIn,
  Star,
} from "lucide-react";
import { EuroNav } from "@/components/euro/euro-nav";
import { EuroFooter } from "@/components/euro/euro-footer";
import { getStorefront } from "@/lib/storefront";
import { listTenantReviews } from "@/lib/reviews";
import { StorefrontBody } from "./storefront-tabs";
import { FollowShareInner } from "./follow-share";

export const dynamic = "force-dynamic";

const HEX6 = /^#[0-9a-fA-F]{6}$/;
const safeHex = (v: string | null | undefined, fb: string) =>
  v && HEX6.test(v) ? v : fb;

const TIER_LABEL: Record<"basic" | "standard" | "premium", string> = {
  basic: "Basic Tier",
  standard: "Standard Tier",
  premium: "Premium Tier",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sf = await getStorefront(slug);
  return {
    title: sf ? `${sf.tenant.name} — Learn online` : "Institute — eurodigital.coach",
    description: sf?.tenant.heroTagline ?? undefined,
  };
}

export default async function InstituteStorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sf = await getStorefront(slug);
  if (!sf) notFound();

  const { tenant, courses } = sf;
  const tenantReviews = await listTenantReviews(tenant.id, { limit: 20 });
  const tenantAvgRating =
    tenantReviews.length === 0
      ? 0
      : tenantReviews.reduce((s, r) => s + r.rating, 0) / tenantReviews.length;
  const primary = safeHex(tenant.brandPrimaryColor, "#1AADE0");
  const secondary = safeHex(tenant.brandSecondaryColor, "#8CC63F");

  // Per-tenant brand vars scoped to this page (course cards, accents).
  const brandVars = {
    "--brand-primary": primary,
    "--brand-secondary": secondary,
    "--brand-gradient": `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
  } as CSSProperties;

  // Reads only — derived from the data we actually have. Metrics we don't
  // track yet (ratings, completion %, instructor count) are omitted from the
  // hero stat row rather than faked.
  const courseCount = courses.length;
  const learnerCount = tenant.learnerCount;
  const sinceYear = tenant.sinceYear;
  const activeOffers = tenant.activeOffers;

  return (
    <div style={{ ...brandVars, background: "var(--ed-bg)" }} className="min-h-screen">
      {tenant.whiteLabel ? (
        <WhiteLabelHeader
          name={tenant.name}
          logoUrl={tenant.logoUrl}
          primary={primary}
        />
      ) : (
        <EuroNav />
      )}

      {/* Hero banner */}
      <section
        className="relative overflow-hidden"
        style={{ background: "var(--ed-ink)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            background:
              "repeating-linear-gradient(135deg, transparent 0 14px, rgba(255,255,255,0.04) 14px 16px)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-20 size-[28rem] rounded-full opacity-30 blur-3xl"
          style={{ background: secondary }}
        />

        <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 lg:flex-row lg:items-start lg:py-12">
          {/* Logo block */}
          <div
            className="flex size-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-3 shadow-xl"
          >
            {tenant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logoUrl}
                alt={tenant.name}
                className="size-full object-contain"
              />
            ) : (
              <span
                className="text-3xl font-extrabold tracking-tight"
                style={{ color: primary }}
              >
                {tenant.name
                  .split(/\s+/)
                  .slice(0, 3)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 3)}
              </span>
            )}
          </div>

          {/* Title block */}
          <div className="min-w-0 flex-1 text-white">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest"
              style={{
                background: "rgba(141,198,63,0.15)",
                border: "1px solid rgba(141,198,63,0.4)",
                color: "#B7E26B",
              }}
            >
              ✓ Verified Partner · {TIER_LABEL[tenant.tier]}
            </span>
            <h1 className="mt-3 text-balance font-display text-3xl font-extrabold leading-tight tracking-tight md:text-[40px]">
              {tenant.name}
            </h1>
            {tenant.heroTagline && (
              <p className="mt-2 max-w-2xl text-balance text-sm leading-relaxed text-white/75 md:text-base">
                {tenant.heroTagline}
              </p>
            )}

            {/* Stat row — only metrics we actually compute */}
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/70">
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="size-3.5" style={{ color: primary }} />
                <span className="font-bold text-white">{courseCount}</span>
                courses
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-3.5" style={{ color: primary }} />
                <span className="font-bold text-white">{learnerCount}</span>
                learners
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" style={{ color: primary }} />
                <span className="font-bold text-white">Est. {sinceYear}</span>
              </span>
              {activeOffers > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Tag className="size-3.5" style={{ color: secondary }} />
                  <span className="font-bold text-white">{activeOffers}</span>
                  active offer{activeOffers === 1 ? "" : "s"}
                </span>
              )}
              {tenantReviews.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Star className="size-3.5 fill-current" style={{ color: "#F5C740" }} />
                  <span className="font-bold text-white">{tenantAvgRating.toFixed(1)}</span>
                  <span>({tenantReviews.length} review{tenantReviews.length === 1 ? "" : "s"})</span>
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 lg:w-56">
            {activeOffers > 0 && (
              <a
                href="#offers"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-extrabold text-black transition-opacity hover:opacity-90"
                style={{ background: secondary }}
              >
                <Tag className="size-4" />
                View All Offers
              </a>
            )}
            <FollowShareButtons
              tenantName={tenant.name}
              tenantSlug={tenant.slug}
            />
          </div>
        </div>
      </section>

      <StorefrontBody
        tenantName={tenant.name}
        heroTagline={tenant.heroTagline}
        companyProfile={tenant.companyProfile}
        introVideoUrl={tenant.introVideoUrl}
        owner={{
          name: tenant.ownerName,
          title: tenant.ownerTitle,
          profile: tenant.ownerProfile,
          photoUrl: tenant.ownerPhotoUrl,
          socials: tenant.ownerSocials,
        }}
        courses={courses}
        stats={{
          courseCount,
          learnerCount,
          sinceYear,
          activeOffers,
          reviewCount: tenantReviews.length,
          avgRating: tenantAvgRating,
        }}
        reviews={tenantReviews.map((r) => ({
          id: r.id,
          authorName: r.authorName ?? "Verified learner",
          rating: r.rating,
          body: r.body,
          courseTitle: r.courseTitle,
          courseSlug: r.courseSlug,
          createdAt: r.createdAt.toISOString().slice(0, 10),
        }))}
      />

      {tenant.whiteLabel ? (
        <WhiteLabelFooter name={tenant.name} />
      ) : (
        <EuroFooter />
      )}
    </div>
  );
}

function WhiteLabelHeader({
  name,
  logoUrl,
  primary,
}: {
  name: string;
  logoUrl: string | null;
  primary: string;
}) {
  return (
    <header
      className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur"
      style={{ borderColor: "var(--ed-line)" }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={name} className="h-9 w-auto object-contain" />
          ) : (
            <div
              className="flex size-9 items-center justify-center rounded-xl text-white"
              style={{ background: primary }}
            >
              <GraduationCap className="size-5" />
            </div>
          )}
          <span className="text-lg font-extrabold tracking-tight" style={{ color: "var(--ed-ink)" }}>
            {name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors hover:bg-secondary"
            style={{ borderColor: "var(--ed-line)" }}
          >
            <LogIn className="size-4" />
            Student login
          </Link>
        </div>
      </div>
    </header>
  );
}

function WhiteLabelFooter({ name }: { name: string }) {
  return (
    <footer
      className="border-t py-8 text-center text-xs"
      style={{ borderColor: "var(--ed-line)", color: "var(--ed-mute)" }}
    >
      © {new Date().getFullYear()} {name}. All rights reserved.
    </footer>
  );
}

function FollowShareButtons({
  tenantName,
  tenantSlug,
}: {
  tenantName: string;
  tenantSlug: string;
}) {
  return (
    <FollowShareInner tenantName={tenantName} tenantSlug={tenantSlug} />
  );
}
