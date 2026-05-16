import type { SuperRole } from "@/lib/auth";

/**
 * Super-layer capabilities (spec §Roles):
 * - SUPER_OWNER   — full: team mgmt, global financials, all writes
 * - SUPER_STAFF   — ops: tenant CRUD + course push, but NO team mgmt, NO global financials
 * - SUPER_SUPPORT — read-only + audited impersonate (no writes)
 */
export const SUPER_ORDER: SuperRole[] = ["SUPER_SUPPORT", "SUPER_STAFF", "SUPER_OWNER"];

export function isSuperRole(role: string | null | undefined): role is SuperRole {
  return role === "SUPER_OWNER" || role === "SUPER_STAFF" || role === "SUPER_SUPPORT";
}

/** SUPPORT is read-only; OWNER/STAFF may perform tenant-level writes. */
export function canWrite(role: SuperRole): boolean {
  return role === "SUPER_OWNER" || role === "SUPER_STAFF";
}

/** Only the OWNER manages the super team. */
export function canManageTeam(role: SuperRole): boolean {
  return role === "SUPER_OWNER";
}

/** Only the OWNER sees platform-wide financial totals. */
export function canSeeFinancials(role: SuperRole): boolean {
  return role === "SUPER_OWNER";
}

/** Any super may impersonate — but every impersonation is audited. */
export function canImpersonate(role: SuperRole): boolean {
  return isSuperRole(role);
}

export const SUPER_ROLE_LABEL: Record<SuperRole, string> = {
  SUPER_OWNER: "Owner",
  SUPER_STAFF: "Staff",
  SUPER_SUPPORT: "Support",
};
