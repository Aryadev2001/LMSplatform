import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  GraduationCap,
  ClipboardList,
  CreditCard,
  Settings,
  BookOpen,
  Activity,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: Record<"admin" | "student", NavItem[]> = {
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
};

export const ROLE_LABELS: Record<"admin" | "student", string> = {
  admin: "Admin",
  student: "Student",
};
