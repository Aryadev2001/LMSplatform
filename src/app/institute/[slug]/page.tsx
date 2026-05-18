import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import {
  GraduationCap,
  LogIn,
  Building2,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  Users,
  CalendarDays,
} from "lucide-react";
import { getStorefront } from "@/lib/storefront";
import { StorefrontBody } from "./storefront-tabs";

export const dynamic = "force-dynamic";

const HEX6 = /^#[0-9a-fA-F]{6}$/;
const safeHex = (v: string | null | undefined, fb: string) =>
  v && HEX6.test(v) ? v : fb;

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
  const primary = safeHex(tenant.brandPrimaryColor, "#00AEEF");
  const secondary = safeHex(tenant.brandSecondaryColor, "#8DC63F");

  // Per-tenant brand vars scoped to this page — identical layout for every
  // institute; only these values + logo + name change.
  const brandVars = {
    "--brand-green": primary,
    "--brand-blue": secondary,
    "--brand-gradient": `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
    "--primary": primary,
    "--ring": secondary,
  } as CSSProperties;

  return (
    <div style={brandVars} className="min-h-screen bg-background text-foreground">
      {/* Header — only logo + name differ per tenant */}
      <header className="sticky top-0 z-20 border-b border-black/5 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {tenant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logoUrl}
                alt={tenant.name}
                className="h-9 w-auto object-contain"
              />
            ) : (
              <div
                className="flex size-9 items-center justify-center rounded-xl text-white"
                style={{ background: "var(--brand-gradient)" }}
              >
                <GraduationCap className="size-5" />
              </div>
            )}
            <span className="text-lg font-bold tracking-tight">{tenant.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <LogIn className="size-4" />
              Student login
            </Link>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Building2 className="size-4" />
              Institute login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-[0.10]"
          style={{ background: "var(--brand-gradient)" }}
        />
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white"
            style={{
              background:
                tenant.status === "ACTIVE" ? "var(--brand-gradient)" : "#6B7A8B",
            }}
          >
            <ShieldCheck className="size-3.5" />
            {tenant.status === "ACTIVE" ? "Verified Partner" : "Trial Institute"}
          </span>
          <h1 className="mt-5 text-balance text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            Learn with{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--brand-gradient)" }}
            >
              {tenant.name}
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-muted-foreground md:text-lg">
            {tenant.heroTagline ??
              "Industry-ready courses, hands-on learning, and verifiable certificates."}
          </p>

          {/* Stats row — real counts only (ratings/completion not modelled). */}
          <div className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-x-10 gap-y-4">
            <Stat icon={BookOpen} value={`${courses.length}`} label="Courses" />
            <Stat icon={Users} value={`${tenant.learnerCount}`} label="Learners" />
            <Stat
              icon={CalendarDays}
              value={`${tenant.sinceYear}`}
              label="On the platform since"
            />
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ background: "var(--brand-gradient)" }}
            >
              Start learning
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#courses"
              className="rounded-xl border border-black/10 px-6 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
            >
              Browse courses
            </a>
          </div>
        </div>
      </section>

      <StorefrontBody
        tenantName={tenant.name}
        heroTagline={tenant.heroTagline}
        courses={courses}
      />

      <footer className="border-t border-black/5 py-8 text-center text-xs text-muted-foreground">
        {tenant.name} · Powered by{" "}
        <span className="font-semibold">eurodigital.coach</span>
      </footer>
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof BookOpen;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <Icon className="size-4 text-muted-foreground" />
      <div className="mt-1 text-2xl font-extrabold tracking-tight">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
