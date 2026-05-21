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

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: Record<DashRole, NavItem[]> = {
  admin: [
    { label: "Overview", href: "/admin", icon: LayoutDashboard },
    { label: "Partner Setup", href: "/admin/partner", icon: UserSquare2 },
    { label: "Students", href: "/admin/students", icon: GraduationCap },
    { label: "Courses", href: "/admin/programs", icon: BookOpen },
    { label: "AI Services", href: "/admin/ai-services", icon: Sparkles },
    { label: "Diagnostics", href: "/admin/diagnostics", icon: Activity },
    { label: "Enrollments", href: "/admin/enrollments", icon: ClipboardList },
    { label: "Payments", href: "/admin/payments", icon: CreditCard },
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
    { label: "Team", href: "/super-admin/team", icon: Users2 },
    { label: "Audit Log", href: "/super-admin/audit", icon: ScrollText },
  ],
};

export const ROLE_LABELS: Record<DashRole, string> = {
  admin: "Admin",
  student: "Student",
  super: "Super Admin",
};
