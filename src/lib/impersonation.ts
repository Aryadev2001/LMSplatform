import { cookies } from "next/headers";

/**
 * Super-admin "view as tenant". The cookie ONLY carries a tenant id — it is
 * not authority. Authority is re-derived every request in getCurrentUser:
 * the override is honored solely when the *session* user is a verified
 * SUPER_* admin. A non-super setting this cookie achieves nothing.
 */
export const IMPERSONATION_COOKIE = "ed_sa_tenant";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getImpersonatedTenantId(): Promise<string | null> {
  const jar = await cookies();
  const v = jar.get(IMPERSONATION_COOKIE)?.value;
  return v && UUID.test(v) ? v : null;
}
