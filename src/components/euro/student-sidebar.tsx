"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  CheckCircle2,
  Heart,
  Sparkles,
  CreditCard,
  Coins,
  Gift,
} from "lucide-react";
import { useWishlist } from "@/lib/wishlist";

interface NavItem {
  label: string;
  href: string;
  icon: typeof BookOpen;
  badge?: string | number;
  tag?: string;
}

export function StudentSidebar({
  name,
  studentCode,
  points,
  activeCourses,
  completed,
}: {
  name: string;
  studentCode: string;
  points: number;
  activeCourses: number;
  completed: number;
}) {
  const pathname = usePathname();
  const { count: wishCount } = useWishlist();

  const initials =
    name
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "ED";

  const groups: { title: string; items: NavItem[] }[] = [
    {
      title: "Learning",
      items: [
        { label: "Dashboard", href: "/student", icon: LayoutDashboard },
        {
          label: "My Courses",
          href: "/student/courses",
          icon: BookOpen,
          badge: activeCourses,
        },
        {
          label: "Completed",
          href: "/student/completed",
          icon: CheckCircle2,
          badge: completed || undefined,
        },
        {
          label: "Wishlist",
          href: "/student/wishlist",
          icon: Heart,
          badge: wishCount || undefined,
        },
      ],
    },
    {
      title: "AI Services",
      items: [
        {
          label: "AI Catalog",
          href: "/student/ai-services",
          icon: Sparkles,
          tag: "NEW",
        },
        {
          label: "Subscriptions",
          href: "/student/ai-subscriptions",
          icon: CreditCard,
        },
      ],
    },
    {
      title: "Rewards",
      items: [
        { label: "Points", href: "/student/points", icon: Coins },
        { label: "Referrals", href: "/student/referrals", icon: Gift },
      ],
    },
  ];

  const isActive = (href: string) =>
    href === "/student" ? pathname === "/student" : pathname.startsWith(href);

  return (
    <aside
      className="flex w-64 shrink-0 flex-col gap-6 px-4 py-6"
      style={{ background: "var(--ed-ink)" }}
    >
      {/* Identity */}
      <div className="px-2">
        <div className="flex items-center gap-3">
          <span
            className="flex size-11 items-center justify-center rounded-full text-sm font-extrabold text-white"
            style={{ background: "var(--ed-teal)" }}
          >
            {initials}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-white">{name}</div>
            <div className="truncate text-[11px] text-white/45">
              Student · {studentCode}
            </div>
          </div>
        </div>

        <div
          className="mt-5 rounded-xl px-4 py-3"
          style={{
            background: "rgba(141,198,63,0.10)",
            border: "1px solid rgba(141,198,63,0.35)",
          }}
        >
          <div
            className="text-2xl font-extrabold tracking-tight"
            style={{ color: "var(--ed-green)" }}
          >
            {points.toLocaleString()}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/45">
            Reward points
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-5">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-white/35">
              {g.title}
            </div>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = isActive(it.href);
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className="relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
                      style={{
                        background: active
                          ? "rgba(255,255,255,0.08)"
                          : "transparent",
                        color: active ? "#fff" : "rgba(255,255,255,0.6)",
                      }}
                    >
                      {active && (
                        <span
                          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full"
                          style={{ background: "var(--ed-green)" }}
                        />
                      )}
                      <it.icon className="size-4 shrink-0" />
                      <span className="flex-1">{it.label}</span>
                      {it.tag && (
                        <span
                          className="rounded px-1.5 py-0.5 text-[9px] font-bold"
                          style={{
                            background: "var(--ed-green)",
                            color: "var(--ed-ink)",
                          }}
                        >
                          {it.tag}
                        </span>
                      )}
                      {it.badge !== undefined && (
                        <span className="text-[11px] font-bold text-white/40">
                          {it.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
