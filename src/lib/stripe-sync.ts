/**
 * Stripe sync — STUB.
 *
 * When Stripe is integrated, `syncPaymentsFromStripe()` will:
 *   1. Use the Stripe SDK with STRIPE_SECRET_KEY
 *   2. List PaymentIntents / Charges (optionally since `payments.stripeSyncedAt`)
 *   3. Upsert each into our `payments` table, matching by stripePaymentIntentId
 *   4. Map Stripe status → our paymentStatusEnum
 *   5. Pull refund totals, payment-method label, receipt URL, customer id
 *   6. Stamp `stripeSyncedAt = now()`
 *
 * For now it is a no-op so the whole tracking UI can ship and be tested with
 * seeded data. The call site already exists (admin Payments page → Sync button).
 */

export type StripeSyncResult = {
  ok: boolean;
  synced: number;
  message: string;
};

export async function syncPaymentsFromStripe(): Promise<StripeSyncResult> {
  const hasStripe = Boolean(process.env.STRIPE_SECRET_KEY);
  if (!hasStripe) {
    return {
      ok: false,
      synced: 0,
      message:
        "Stripe is not connected yet. Add STRIPE_SECRET_KEY and the live sync will pull real payments here.",
    };
  }

  // TODO: real Stripe sync implementation goes here.
  return {
    ok: true,
    synced: 0,
    message: "Stripe connected — sync implementation pending.",
  };
}
