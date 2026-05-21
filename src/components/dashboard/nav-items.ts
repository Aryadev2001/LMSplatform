import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  GraduationCap,
  ClipboardList,
  CreditCard,
  Settings,
  BookOpen,
  Activity,
  Building2,
  Users2,
  ScrollText,
  Gift,
  Library,
  Sparkles,
  UserSquare2,
} from "lucide-react";

export type DashRole = "admin" | "student" | "super";
export type PartnerTier = "basic" | "standard" | "premium";
export type FeatureKey = "ai_services" | "diagnostics" | "white_label";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Minimum partner tier to use this link. Omit = available to Basic. */
  minTier?: PartnerTier;
  /** Feature override key — when set, an explicit override on the tenant
   *  beats the tier requirement (grant or revoke). */
  featureKey?: FeatureKey;
};

export const NAV_ITEMS: Record<DashRole, NavItem[]> = {
  admin: [
    { label: "Overview", href: "/admin", icon: LayoutDashboard },
    { label: "Partner Setup", href: "/admin/partner", icon: UserSquare2 },
    { label: "Students", href: "/admin/students", icon: GraduationCap },
    { label: "Courses", href: "/admin/programs", icon: BookOpen },
    { label: "Enrollments", href: "/admin/enrollments", icon: ClipboardList },
    { label: "Payments", href: "/admin/payments", icon: CreditCard },
    {
      label: "AI Services",
      href: "/admin/ai-services",
      icon: Sparkles,
      minTier: "premium",
      featureKey: "ai_services",
    },
    {
      label: "Diagnostics",
      href: "/admin/diagnostics",
      icon: Activity,
      minTier: "premium",
      featureKey: "diagnostics",
    },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ],
  student: [
    { label: "Overview", href: "/student", icon: LayoutDashboard },
    { label: "My Courses", href: "/student/courses", icon: BookOpen },
    { label: "My Diagnostic", href: "/student/diagnostic", icon: Activity },
    { label: "AI Services", href: "/student/ai-services", icon: Sparkles },
    { label: "AI Subscriptions", href: "/student/ai-subscriptions", icon: CreditCard },
    { label: "Referrals", href: "/student/referrals", icon: Gift },
    { label: "Settings", href: "/student/settings", icon: Settings },
  ],
  super: [
    { label: "Overview", href: "/super-admin", icon: LayoutDashboard },
    { label: "Tenants", href: "/super-admin/tenants", icon: Building2 },
    { label: "Master Courses", href: "/super-admin/courses", icon: Library },
    { label: "Payments", href: "/super-admin/payments", icon: CreditCard },
    { label: "Team", href: "/super-admin/team", icon: Users2 },
    { label: "Audit Log", href: "/super-admin/audit", icon: ScrollText },
  ],
};

export const ROLE_LABELS: Record<DashRole, string> = {
  admin: "Admin",
  student: "Student",
  super: "Super Admin",
};
