import { getTenantFromRequest } from "@/lib/tenant";

const HEX6 = /^#[0-9a-fA-F]{6}$/;
const EDT_PRIMARY = "#8cc63f";
const EDT_SECONDARY = "#1aade0";

function safeHex(value: string | null | undefined, fallback: string): string {
  return value && HEX6.test(value) ? value.toLowerCase() : fallback;
}

/**
 * Per-tenant whitelabeling: override the brand CSS custom properties with the
 * resolved tenant's colors. Default tenant ('edt') carries the original EDT
 * palette, so apex/localhost render byte-identically (zero regression).
 *
 * Server component — resolves the active host tenant (request-cached) and
 * emits a tiny <style> that re-binds the brand tokens already defined in
 * globals.css. Only strictly-validated #rrggbb values are interpolated.
 */
export async function TenantBrandStyle() {
  const tenant = await getTenantFromRequest();
  const primary = safeHex(tenant?.brandPrimaryColor, EDT_PRIMARY);
  const secondary = safeHex(tenant?.brandSecondaryColor, EDT_SECONDARY);

  // Identical to EDT defaults → skip the style tag entirely.
  if (primary === EDT_PRIMARY && secondary === EDT_SECONDARY) return null;

  const css = `:root{--brand-green:${primary};--brand-blue:${secondary};--brand-gradient:linear-gradient(135deg, ${primary} 0%, ${secondary} 100%);--primary:${primary};--ring:${secondary};}`;

  return <style data-tenant-brand dangerouslySetInnerHTML={{ __html: css }} />;
}
