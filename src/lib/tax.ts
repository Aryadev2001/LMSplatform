/**
 * Tax rule by billing country (master prompt §8.5). Pure + framework-free
 * so the client cart UI and the server order writer compute identical
 * numbers from one source.
 *
 * `rateBps` is the same rate in basis points (UAE VAT 5% = 500,
 * India GST 18% = 1800) — what `orders.tax_rate_bps` stores.
 */
export function taxRateFor(country: string): {
  rate: number;
  rateBps: number;
  label: string;
} {
  const c = country.trim().toLowerCase();
  if (["ae", "uae", "united arab emirates"].includes(c))
    return { rate: 0.05, rateBps: 500, label: "VAT 5%" };
  if (["in", "india"].includes(c))
    return { rate: 0.18, rateBps: 1800, label: "GST 18%" };
  return { rate: 0, rateBps: 0, label: "Tax" };
}
