import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNotNull } from "drizzle-orm";
import { Package, BookOpen, CheckCircle2, Building2 } from "lucide-react";
import { db } from "@/db/client";
import { bundles, bundleItems, programs, tenants } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { EuroNav } from "@/components/euro/euro-nav";
import { EuroFooter } from "@/components/euro/euro-footer";
import { EnrollBundleButton } from "./enroll-bundle-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [b] = await db.select({ name: bundles.name }).from(bundles).where(eq(bundles.slug, slug)).limit(1);
  return { title: b ? `${b.name} — Bundle — eurodigital.coach` : "Bundle — eurodigital.coach" };
}

export default async function BundlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [bundle] = await db
    .select()
    .from(bundles)
    .where(and(eq(bundles.slug, slug), eq(bundles.isActive, true)))
    .limit(1);
  if (!bundle) notFound();

  const [[institute], courses, me] = await Promise.all([
    db
      .select({ name: tenants.name, slug: tenants.slug })
      .from(tenants)
      .where(eq(tenants.id, bundle.tenantId))
      .limit(1),
    db
      .select({
        id: programs.id,
        name: programs.name,
        slug: programs.slug,
        tagline: programs.tagline,
        priceCents: programs.priceCents,
        currency: programs.currency,
      })
      .from(bundleItems)
      .innerJoin(programs, eq(programs.id, bundleItems.programId))
      .where(
        and(
          eq(bundleItems.bundleId, bundle.id),
          eq(programs.status, "published"),
          isNotNull(programs.approvedAt),
        ),
      ),
    getCurrentUser(),
  ]);

  if (courses.length === 0) notFound();

  const listCents = courses.reduce((s, c) => s + c.priceCents, 0);
  const savings = Math.max(0, listCents - bundle.priceCents);
  const isSignedIn = !!me;

  return (
    <div style={{ background: "var(--ed-bg)" }} className="min-h-screen">
      <EuroNav />

      <section className="border-b" style={{ borderColor: "var(--ed-line)" }}>
        <div className="mx-auto max-w-7xl px-6 py-10">
          <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-xs font-medium" style={{ color: "var(--ed-mute)" }}>
            <Link href="/" className="hover:underline">Home</Link>
            <span>/</span>
            {institute && (
              <>
                <Link href={`/institute/${institute.slug}`} className="hover:underline">{institute.name}</Link>
                <span>/</span>
              </>
            )}
            <span style={{ color: "var(--ed-ink-2)" }}>{bundle.name}</span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
            <div>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white"
                style={{ background: "var(--ed-ink)" }}
              >
                <Package className="size-3" /> Bundle · {courses.length} courses
              </span>
              <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl" style={{ color: "var(--ed-ink)" }}>
                {bundle.name}
              </h1>
              {bundle.description && (
                <p className="mt-3 text-balance md:text-lg" style={{ color: "var(--ed-mute)" }}>
                  {bundle.description}
                </p>
              )}
              {institute && (
                <Link href={`/institute/${institute.slug}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--ed-blue)" }}>
                  <Building2 className="size-4" /> {institute.name}
                </Link>
              )}

              <h2 className="mt-8 text-lg font-extrabold" style={{ color: "var(--ed-ink)" }}>
                What&apos;s included
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {courses.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-start gap-2.5 rounded-2xl border bg-white p-4"
                    style={{ borderColor: "var(--ed-line)" }}
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" style={{ color: "var(--ed-green)" }} />
                    <div className="min-w-0">
                      <div className="text-sm font-bold" style={{ color: "var(--ed-ink)" }}>
                        {c.slug ? (
                          <Link href={`/courses/${c.slug}`} className="hover:underline">{c.name}</Link>
                        ) : (
                          c.name
                        )}
                      </div>
                      {c.tagline && <div className="mt-0.5 line-clamp-2 text-xs" style={{ color: "var(--ed-mute)" }}>{c.tagline}</div>}
                      <div className="mt-1 text-[11px] font-medium" style={{ color: "var(--ed-mute)" }}>
                        {c.priceCents === 0 ? "Free separately" : `${formatCurrency(c.priceCents, c.currency)} separately`}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Buy box */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="overflow-hidden rounded-2xl border bg-white p-6 shadow-sm" style={{ borderColor: "var(--ed-line)" }}>
                <div className="text-3xl font-extrabold" style={{ color: "var(--ed-ink)" }}>
                  {bundle.priceCents === 0 ? "Free" : formatCurrency(bundle.priceCents, bundle.currency)}
                </div>
                {savings > 0 && (
                  <div className="mt-1 text-sm font-semibold" style={{ color: "var(--ed-green-dark, #4f7f1c)" }}>
                    Save {formatCurrency(savings, bundle.currency)} vs buying separately
                  </div>
                )}
                <div className="mt-1 text-xs" style={{ color: "var(--ed-mute)" }}>
                  One payment · enrolls you in all {courses.length} courses
                </div>
                <div className="mt-5">
                  <EnrollBundleButton
                    slug={slug}
                    isSignedIn={isSignedIn}
                    ctaLabel={bundle.priceCents === 0 ? "Enroll free" : "Enroll in bundle"}
                  />
                </div>
                <ul className="mt-5 space-y-2.5">
                  {courses.slice(0, 8).map((c) => (
                    <li key={c.id} className="flex items-center gap-2 text-xs" style={{ color: "var(--ed-ink-2)" }}>
                      <BookOpen className="size-4 shrink-0" style={{ color: "var(--ed-green)" }} />
                      <span className="truncate">{c.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <EuroFooter />
    </div>
  );
}
