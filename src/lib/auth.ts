import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { users, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getImpersonatedTenantId } from "@/lib/impersonation";

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
  role: UserRole | null; // normalized (effective — may be "admin" while a
  // super-admin is impersonating a tenant)
  rawRole: RawRole | null; // exact DB role — ALWAYS the real one (super gating)
  tenantId: string | null; // effective tenant (impersonated one for a super)
  email?: string;
  impersonating?: boolean; // true when a super-admin is acting as a tenant
}

/**
 * Resolves the current user. Cached per request.
 * DB is the source of truth post phase-7 (Clerk session-token claim is a fast
 * path but our DB carries the canonical role + tenantId).
 */
const resolveCurrentUser = async (): Promise<CurrentUser | null> => {
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

  // No DB row yet → just-in-time provisioning from the Clerk invitation
  // metadata (role + tenantId). This replaces the optional Clerk webhook:
  // an invited tenant-admin / student gets their tenant-scoped row on their
  // first authenticated request, so no infra (CLERK_WEBHOOK_SECRET) is
  // required for invites to work end-to-end.
  try {
    const cu = await currentUser();
    const pub = (cu?.publicMetadata ?? {}) as {
      role?: string;
      tenantId?: string;
    };
    // Self-serve sign-ups carry their role in unsafeMetadata (set client-side
    // by the SignUp component); invited admins/students use publicMetadata
    // (set server-side at invitation time).
    const uns = (cu?.unsafeMetadata ?? {}) as { role?: string };
    const rawMeta = pub.role ?? uns.role ?? null;
    const email = cu?.primaryEmailAddress?.emailAddress ?? null;
    const fullName =
      [cu?.firstName, cu?.lastName].filter(Boolean).join(" ").trim() || null;

    // Can't determine a role → leave unprovisioned (→ /onboarding).
    if (!rawMeta || !email) {
      return {
        userId,
        rawRole: (rawMeta as RawRole | null) ?? null,
        role: normalizeRole(rawMeta as RawRole | null),
        tenantId: null,
        email: email ?? undefined,
      };
    }

    // Self-serve partner sign-up (Basic tier): auto-provision a personal
    // tenant on the FREE tier and become its TENANT_ADMIN. Standard and
    // Premium tiers are paid upgrades (Stripe Checkout from
    // /admin/partner/billing). Legacy 'creator' role is treated as 'basic'
    // for backwards-compat with sessions that signed up before the rename.
    const lowerRole = rawMeta.toLowerCase();
    if (lowerRole === "basic_partner" || lowerRole === "creator") {
      const makeSlug = () => `c-${Math.random().toString(36).slice(2, 10)}`;
      let tenantId: string | null = null;
      for (let i = 0; i < 3 && !tenantId; i++) {
        try {
          const [t] = await db
            .insert(tenants)
            .values({
              slug: makeSlug(),
              name: fullName ? `${fullName}'s page` : "My page",
              status: "ACTIVE",
              tier: "basic",
              // creatorOnly retained for backwards-compat reads.
              creatorOnly: true,
            })
            .returning({ id: tenants.id });
          tenantId = t.id;
        } catch {
          /* slug collision (1 in ~3T) — retry */
        }
      }
      if (!tenantId) {
        // Could not provision; render as unprovisioned learner-ish.
        return {
          userId,
          rawRole: null,
          role: null,
          tenantId: null,
          email,
        };
      }

      try {
        await db.insert(users).values({
          clerkId: userId,
          email,
          fullName,
          role: CANONICAL_ADMIN,
          isSuperAdmin: false,
          tenantId,
        });
      } catch {
        const [again] = await db
          .select({
            role: users.role,
            email: users.email,
            tenantId: users.tenantId,
          })
          .from(users)
          .where(eq(users.clerkId, userId))
          .limit(1);
        if (again) {
          const raw = again.role as RawRole;
          return {
            userId,
            rawRole: raw,
            role: normalizeRole(raw),
            tenantId: again.tenantId,
            email: again.email,
          };
        }
      }

      return {
        userId,
        rawRole: CANONICAL_ADMIN,
        role: "admin",
        tenantId,
        email,
      };
    }

    // Canonicalize like the webhook does; super roles pass through tenant-less.
    const canonical: RawRole = isAdminRole(rawMeta)
      ? CANONICAL_ADMIN
      : isStudentRole(rawMeta)
        ? CANONICAL_STUDENT
        : (rawMeta as RawRole);
    const isSuper = SUPER_ROLES.includes(canonical);
    const tenantId =
      !isSuper && typeof pub.tenantId === "string" ? pub.tenantId : null;

    try {
      await db.insert(users).values({
        clerkId: userId,
        email,
        fullName,
        role: canonical,
        isSuperAdmin: isSuper,
        tenantId,
      });
    } catch {
      // Lost an insert race (or email already attached to another clerkId):
      // re-read so we return the authoritative persisted row.
      const [again] = await db
        .select({ role: users.role, email: users.email, tenantId: users.tenantId })
        .from(users)
        .where(eq(users.clerkId, userId))
        .limit(1);
      if (again) {
        const raw = again.role as RawRole;
        return {
          userId,
          rawRole: raw,
          role: normalizeRole(raw),
          tenantId: again.tenantId,
          email: again.email,
        };
      }
    }

    return {
      userId,
      rawRole: canonical,
      role: normalizeRole(canonical),
      tenantId,
      email,
    };
  } catch {
    return { userId, rawRole: null, role: null, tenantId: null };
  }
};

/**
 * Apply the super-admin tenant-impersonation overlay. Only a verified
 * SUPER_* session user can be overlaid; rawRole stays the real super role
 * (so /super-admin + Exit still work), but role/tenantId become an effective
 * tenant-admin scoped to the impersonated tenant.
 */
async function applyImpersonation(
  base: CurrentUser | null,
): Promise<CurrentUser | null> {
  if (!base || !SUPER_ROLES.includes(base.rawRole as RawRole)) return base;
  const tenantId = await getImpersonatedTenantId();
  if (!tenantId) return base;
  const [t] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  if (!t) return base;
  return { ...base, role: "admin", tenantId, impersonating: true };
}

/**
 * Resolves the current user (cached per request), with the super-admin
 * impersonation overlay applied.
 */
export const getCurrentUser = cache(
  async (): Promise<CurrentUser | null> =>
    applyImpersonation(await resolveCurrentUser()),
);

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
