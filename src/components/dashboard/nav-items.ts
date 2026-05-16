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
    { label: "Students", href: "/admin/students", icon: GraduationCap },
    { label: "Courses", href: "/admin/programs", icon: BookOpen },
    { label: "Diagnostics", href: "/admin/diagnostics", icon: Activity },
    { label: "Enrollments", href: "/admin/enrollments", icon: ClipboardList },
    { label: "Payments", href: "/admin/payments", icon: CreditCard },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ],
  student: [
    { label: "Overview", href: "/student", icon: LayoutDashboard },
    { label: "My Courses", href: "/student/courses", icon: BookOpen },
    { label: "My Diagnostic", href: "/student/diagnostic", icon: Activity },
    { label: "Settings", href: "/student/settings", icon: Settings },
  ],
  super: [
    { label: "Overview", href: "/super-admin", icon: LayoutDashboard },
    { label: "Tenants", href: "/super-admin/tenants", icon: Building2 },
    { label: "Team", href: "/super-admin/team", icon: Users2 },
    { label: "Audit Log", href: "/super-admin/audit", icon: ScrollText },
  ],
};

export const ROLE_LABELS: Record<DashRole, string> = {
  admin: "Admin",
  student: "Student",
  super: "Super Admin",
};
