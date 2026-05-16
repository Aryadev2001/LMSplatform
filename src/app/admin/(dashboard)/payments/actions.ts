"use server";

import { db } from "@/db/client";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { users } from "@/db/schema";
import { hasPermission } from "@/lib/permissions";
import { syncPaymentsFromStripe } from "@/lib/stripe-sync";

async function requireViewPayments() {
  const me = await requireRole("admin");
  const [row] = await db
    .select({ isSuperAdmin: users.isSuperAdmin, permissions: users.permissions })
    .from(users)
    .where(eq(users.clerkId, me.userId))
    .limit(1);
  if (!hasPermission(row, "view_payments")) {
    return { ok: false as const, error: "You don't have permission to manage payments." };
  }
  return { ok: true as const };
}

export async function syncStripeAction() {
  const gate = await requireViewPayments();
  if (!gate.ok) return { ok: false as const, synced: 0, message: gate.error };

  const result = await syncPaymentsFromStripe();
  if (result.ok) revalidatePath("/admin/payments");
  return result;
}

/**
 * Manual refund marker. With Stripe live this will call the Stripe refund API;
 * for now it just records the refund locally so the workflow is testable.
 */
export async function markRefunded(paymentId: string, amountCents: number) {
  const gate = await requireViewPayments();
  if (!gate.ok) return { success: false as const, error: gate.error };

  const [pay] = await db
    .select({ amountCents: payments.amountCents, refundedCents: payments.refundedCents })
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);
  if (!pay) return { success: false as const, error: "Payment not found" };

  const newRefunded = Math.min(pay.amountCents, pay.refundedCents + amountCents);
  const fullyRefunded = newRefunded >= pay.amountCents;

  await db
    .update(payments)
    .set({
      refundedCents: newRefunded,
      status: fullyRefunded ? "refunded" : "succeeded",
    })
    .where(eq(payments.id, paymentId));

  revalidatePath("/admin/payments");
  return { success: true as const };
}
