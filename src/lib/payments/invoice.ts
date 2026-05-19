import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, orderItems, invoices, tenants } from "@/db/schema";

/** "VAT 5%" / "GST 18%" / "Tax" — mirrors lib/tax.ts, reproducibly. */
function labelForBps(bps: number): string | null {
  if (bps === 500) return "VAT 5%";
  if (bps === 1800) return "GST 18%";
  if (bps > 0) return "Tax";
  return null;
}

/**
 * Issue the immutable invoice for a paid order. Called at the end of the
 * single fulfilment path, so mock / live / webhook / reconcile all produce
 * exactly one. Idempotent: unique order_id + onConflictDoNothing means a
 * replay/retry never duplicates. Snapshot (not a view) so the receipt is
 * frozen even if the order/tenant later changes; lines render from the
 * already-snapshotted order_items.
 */
export async function createInvoiceForOrder(orderId: string): Promise<void> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order || order.status !== "paid") return;

  const lines = await db
    .select({ tenantId: orderItems.tenantId })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  if (lines.length === 0) return;

  const tenantIds = [...new Set(lines.map((l) => l.tenantId))];
  let sellerName = "eurodigital.coach (multiple institutes)";
  let tenantId: string | null = null;
  if (tenantIds.length === 1) {
    tenantId = tenantIds[0];
    const [t] = await db
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    sellerName = t?.name ?? sellerName;
  }

  await db
    .insert(invoices)
    .values({
      orderId: order.id,
      invoiceNumber: `INV-${order.orderRef}`,
      tenantId,
      userId: order.userId,
      sellerName,
      billingName: order.billingName,
      billingEmail: order.billingEmail,
      billingCountry: order.billingCountry,
      currency: order.currency,
      subtotalCents: order.subtotalCents,
      discountCents: order.discountCents,
      pointsRedeemedCents: order.pointsRedeemedCents,
      taxCents: order.taxCents,
      taxRateBps: order.taxRateBps,
      taxLabel: labelForBps(order.taxRateBps),
      totalCents: order.totalCents,
    })
    .onConflictDoNothing({ target: invoices.orderId });
}
