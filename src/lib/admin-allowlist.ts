/**
 * Initial admin allowlist. Only emails in this list can be bootstrapped as admin
 * via the `/api/bootstrap-admin` endpoint. Additional admins can be promoted from
 * within the admin dashboard once the first admin is signed in.
 */
export const ADMIN_BOOTSTRAP_ALLOWLIST = [
  "irfan@eurodigital.ae",
  "arya@closerx.ai",
  "aryaabinash2001@gmail.com",
] as const;

export function isAllowedToBootstrap(email: string) {
  return ADMIN_BOOTSTRAP_ALLOWLIST.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}
