export const ADMIN_PERMISSIONS = [
  "manage_admins",
  "manage_students",
  "manage_courses",
  "view_diagnostics",
  "view_payments",
  "view_analytics",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<AdminPermission, { label: string; description: string }> = {
  manage_admins: {
    label: "Manage admins",
    description: "Add, remove, and set permissions for other admins.",
  },
  manage_students: {
    label: "Manage students",
    description: "View students and manage their course enrollments.",
  },
  manage_courses: {
    label: "Manage courses",
    description: "Create, edit, and archive courses, modules, and lessons.",
  },
  view_diagnostics: {
    label: "View diagnostics",
    description: "Review Business X-Ray submissions and scores.",
  },
  view_payments: {
    label: "View payments",
    description: "Access the payments log and revenue figures.",
  },
  view_analytics: {
    label: "View analytics",
    description: "Access the analytics and reporting dashboards.",
  },
};

/**
 * Super admins implicitly have every permission. Regular admins only have the
 * permissions explicitly granted to them.
 */
export function hasPermission(
  user: { isSuperAdmin?: boolean; permissions?: string[] } | null | undefined,
  permission: AdminPermission,
): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  return (user.permissions ?? []).includes(permission);
}
