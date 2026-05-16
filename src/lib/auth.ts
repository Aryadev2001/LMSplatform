import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/** Raw role values stored in the DB (legacy + phase-7). */
export type RawRole =
  | "admin"
  | "coach"
  | "student"
  | "SUPER_OWNER"
  | "SUPER_STAFF"
  | "SUPER_SUPPORT"
  | "TENANT_ADMIN"
  | "INSTRUCTOR"
  | "STUDENT";

/** Normalized role used by the existing dashboards (zero-churn compatibility). */
export type UserRole = "admin" | "student" | "super";

export type SuperRole = "SUPER_OWNER" | "SUPER_STAFF" | "SUPER_SUPPORT";

const SUPER_ROLES: RawRole[] = ["SUPER_OWNER", "SUPER_STAFF", "SUPER_SUPPORT"];

/**
 * DB role-value groups. The phase-7 backfill remapped legacy lowercase
 * (admin/student/coach) → UPPERCASE (TENANT_ADMIN/STUDENT). Some rows created
 * before standardization may still be lowercase, so every role *filter* must
 * accept BOTH vocabularies. New writes use the canonical UPPERCASE value.
 */
export const ADMIN_DB_ROLES = ["admin", "TENANT_ADMIN"] as const;
export const STUDENT_DB_ROLES = ["student", "STUDENT", "coach"] as const;
export const CANONICAL_ADMIN: RawRole = "TENANT_ADMIN";
export const CANONICAL_STUDENT: RawRole = "STUDENT";

export function isAdminRole(role: string | null | undefined) {
  return role === "admin" || role === "TENANT_ADMIN";
}
export function isStudentRole(role: string | null | undefined) {
  return role === "student" || role === "STUDENT" || role === "coach";
}

/** Map any raw DB role to the normalized role the existing app reasons about. */
export function normalizeRole(raw: RawRole | null | undefined): UserRole | null {
  if (!raw) return null;
  if (raw === "admin" || raw === "TENANT_ADMIN") return "admin";
  if (raw === "student" || raw === "STUDENT" || raw === "coach") return "student";
  if (SUPER_ROLES.includes(raw)) return "super";
  // INSTRUCTOR: enum slot reserved, no dashboard until built → no access
  return null;
}

export interface CurrentUser {
  userId: string; // clerk id
  role: UserRole | null; // normalized
  rawRole: RawRole | null; // exact DB role (for super-admin gating)
  tenantId: string | null;
  email?: string;
}

/**
 * Resolves the current user. Cached per request.
 * DB is the source of truth post phase-7 (Clerk session-token claim is a fast
 * path but our DB carries the canonical role + tenantId).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  const dbRow = await db
    .select({ role: users.role, email: users.email, tenantId: users.tenantId })
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);

  if (dbRow.length > 0) {
    const raw = dbRow[0].role as RawRole;
    return {
      userId,
      rawRole: raw,
      role: normalizeRole(raw),
      tenantId: dbRow[0].tenantId,
      email: dbRow[0].email,
    };
  }

  // Last resort: Clerk publicMetadata (newly-invited users before DB sync)
  try {
    const cu = await currentUser();
    const metaRole = (cu?.publicMetadata as { role?: RawRole } | undefined)?.role ?? null;
    return {
      userId,
      rawRole: metaRole,
      role: normalizeRole(metaRole),
      tenantId: null,
      email: cu?.primaryEmailAddress?.emailAddress,
    };
  } catch {
    return { userId, rawRole: null, role: null, tenantId: null };
  }
});

/**
 * Gate a tenant-dashboard route by normalized role. Unchanged signature so all
 * existing call sites (`requireRole("admin"|"student")`) keep working — a
 * TENANT_ADMIN now normalizes to "admin", STUDENT to "student".
 */
export async function requireRole(allowed: UserRole | UserRole[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const allowedList = Array.isArray(allowed) ? allowed : [allowed];
  // Tenant-admin may access student routes within their own tenant (legacy
  // "admin-sees-everything" behavior, scoped by tenant middleware in P7-2).
  const ok = user.role !== null && (allowedList.includes(user.role) || user.role === "admin");
  if (!ok) redirect("/forbidden");
  return user;
}

/** Gate a /super-admin route. Optionally require a minimum super tier. */
export async function requireSuper(min: SuperRole = "SUPER_SUPPORT") {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  const order: SuperRole[] = ["SUPER_SUPPORT", "SUPER_STAFF", "SUPER_OWNER"];
  const have = user.rawRole as SuperRole | null;
  if (!have || !order.includes(have) || order.indexOf(have) < order.indexOf(min)) {
    redirect("/forbidden");
  }
  return user;
}
