import Link from "next/link";
import {
  Search,
  User,
  Briefcase,
  GraduationCap,
  BadgeCheck,
  Landmark,
  Palette,
} from "lucide-react";
import { EuroLogo } from "./euro-logo";
import { CartIndicator } from "./cart-button";
import { NavAuth } from "./nav-auth";

export const EURO_CATEGORIES = [
  { slug: "individuals", label: "Individuals", icon: User },
  { slug: "business", label: "Business", icon: Briefcase },
  { slug: "academic", label: "Academic", icon: GraduationCap },
  { slug: "certification", label: "Certification", icon: BadgeCheck },
  { slug: "government", label: "Government", icon: Landmark },
  { slug: "hobby", label: "Hobby & Skills", icon: Palette },
] as const;

export function EuroNav() {
  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur"
      style={{ borderColor: "var(--ed-line)", background: "rgba(255,255,255,0.85)" }}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3.5">
        <Link href="/" className="shrink-0">
          <EuroLogo />
        </Link>

        <nav className="ml-2 hidden items-center gap-1 lg:flex">
          {EURO_CATEGORIES.slice(0, 4).map((c) => (
            <Link
              key={c.slug}
              href={`/explore?category=${c.slug}`}
              className="rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--ed-bg)]"
              style={{ color: "var(--ed-ink-2)" }}
            >
              {c.label}
            </Link>
          ))}
          <Link
            href="/pricing"
            className="rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--ed-bg)]"
            style={{ color: "var(--ed-ink-2)" }}
          >
            Pricing
          </Link>
        </nav>

        <form action="/explore" className="relative ml-auto hidden flex-1 md:block md:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
            style={{ color: "var(--ed-mute)" }}
          />
          <input
            name="q"
            placeholder="Search 25,000+ courses…"
            className="h-10 w-full rounded-xl border bg-white pl-9 pr-3 text-sm outline-none focus:ring-2"
            style={{ borderColor: "var(--ed-line)" }}
          />
        </form>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <CartIndicator />
          <NavAuth />
        </div>
      </div>
    </header>
  );
}
