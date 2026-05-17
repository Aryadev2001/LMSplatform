export type DnsRecord = { type: "A" | "CNAME"; name: string; value: string };

/** Vercel's documented stable targets for custom domains. */
export const VERCEL_A_IP = "76.76.21.21";
export const VERCEL_CNAME = "cname.vercel-dns.com";

/**
 * The DNS records a tenant must add at their registrar for `domain`.
 * Apex (≤2 labels) → A @ + www CNAME; subdomain → CNAME on the host label.
 * Multi-part TLDs (co.uk) are an edge — the operator confirms the exact
 * records when adding the domain in Vercel either way.
 */
export function dnsRecordsFor(domain: string): DnsRecord[] {
  const d = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  if (!d || !d.includes(".")) return [];
  const parts = d.split(".");
  if (parts.length <= 2) {
    return [
      { type: "A", name: "@", value: VERCEL_A_IP },
      { type: "CNAME", name: "www", value: VERCEL_CNAME },
    ];
  }
  const host = parts.slice(0, parts.length - 2).join(".");
  return [{ type: "CNAME", name: host, value: VERCEL_CNAME }];
}
