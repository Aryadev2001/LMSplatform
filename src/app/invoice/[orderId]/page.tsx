import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db/client";
import { invoices, orderItems, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Receipt — eurodigital.coach" };

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const me = await getCurrentUser();
  if (!me) redirect("/sign-in");

  const [inv] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.orderId, orderId))
    .limit(1);
  if (!inv) notFound();

  const [dbUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, me.userId))
    .limit(1);

  // Buyer, the selling institute's admin, or a super-admin. Anyone else
  // gets a 404 (don't reveal the receipt exists).
  const isBuyer = !!dbUser && inv.userId === dbUser.id;
  const isInstituteAdmin =
    me.role === "admin" && !!inv.tenantId && me.tenantId === inv.tenantId;
  const isSuper = me.role === "super";
  if (!isBuyer && !isInstituteAdmin && !isSuper) notFound();

  const lines = await db
    .select({
      title: orderItems.title,
      unitPriceCents: orderItems.unitPriceCents,
      quantity: orderItems.quantity,
      currency: orderItems.currency,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  const cur = inv.currency;
  const issued = inv.issuedAt.toISOString().slice(0, 10);

  return (
    <div style={{ background: "var(--ed-bg)" }} className="min-h-screen">
      {/* Action bar — hidden when printing */}
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5 print:hidden">
        <Link
          href="/student/courses"
          className="inline-flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: "var(--ed-mute)" }}
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <PrintButton />
      </div>

      <div className="mx-auto max-w-3xl px-6 pb-16 print:px-0 print:pb-0">
        <div
          className="rounded-2xl border bg-white p-10 print:rounded-none print:border-0 print:p-0"
          style={{ borderColor: "var(--ed-line)" }}
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div
                className="text-xl font-extrabold tracking-tight"
                style={{ color: "var(--ed-ink)" }}
              >
                {inv.sellerName}
              </div>
              <div
                className="mt-0.5 text-xs"
                style={{ color: "var(--ed-mute)" }}
              >
                Sold via eurodigital.coach
              </div>
            </div>
            <div className="text-right">
              <div
                className="text-2xl font-extrabold tracking-tight"
                style={{ color: "var(--ed-ink)" }}
              >
                RECEIPT
              </div>
              <div
                className="mt-1 font-mono text-xs"
                style={{ color: "var(--ed-mute)" }}
              >
                {inv.invoiceNumber}
              </div>
              {inv.status === "void" && (
                <div className="mt-1 text-xs font-bold text-rose-600">VOID</div>
              )}
            </div>
          </div>

          <div
            className="my-7 h-px w-full"
            style={{ background: "var(--ed-line)" }}
          />

          {/* Meta */}
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <div
                className="text-[11px] font-bold uppercase tracking-widest"
                style={{ color: "var(--ed-mute)" }}
              >
                Billed to
              </div>
              <div className="mt-1.5" style={{ color: "var(--ed-ink)" }}>
                {inv.billingName ?? "—"}
              </div>
              <div style={{ color: "var(--ed-mute)" }}>
                {inv.billingEmail ?? ""}
              </div>
              {inv.billingCountry && (
                <div style={{ color: "var(--ed-mute)" }}>
                  {inv.billingCountry}
                </div>
              )}
              {inv.taxId && (
                <div style={{ color: "var(--ed-mute)" }}>
                  Tax ID: {inv.taxId}
                </div>
              )}
            </div>
            <div className="text-right">
              <div
                className="text-[11px] font-bold uppercase tracking-widest"
                style={{ color: "var(--ed-mute)" }}
              >
                Issued
              </div>
              <div className="mt-1.5" style={{ color: "var(--ed-ink)" }}>
                {issued}
              </div>
              <div
                className="mt-2 text-[11px] font-bold uppercase tracking-widest"
                style={{ color: "var(--ed-mute)" }}
              >
                Status
              </div>
              <div className="mt-1 font-semibold text-emerald-600">Paid</div>
            </div>
          </div>

          {/* Lines */}
          <table className="mt-8 w-full text-sm">
            <thead>
              <tr
                className="text-left text-[11px] font-bold uppercase tracking-widest"
                style={{ color: "var(--ed-mute)" }}
              >
                <th className="pb-2">Item</th>
                <th className="pb-2 text-center">Qty</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr
                  key={i}
                  className="border-t"
                  style={{ borderColor: "var(--ed-line)" }}
                >
                  <td
                    className="py-2.5 font-medium"
                    style={{ color: "var(--ed-ink)" }}
                  >
                    {l.title}
                  </td>
                  <td
                    className="py-2.5 text-center"
                    style={{ color: "var(--ed-mute)" }}
                  >
                    {l.quantity}
                  </td>
                  <td
                    className="py-2.5 text-right font-semibold"
                    style={{ color: "var(--ed-ink)" }}
                  >
                    {formatCurrency(l.unitPriceCents * l.quantity, cur)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-6 ml-auto w-full max-w-xs space-y-1.5 text-sm">
            <Row k="Subtotal" v={formatCurrency(inv.subtotalCents, cur)} />
            {inv.discountCents > 0 && (
              <Row
                k="Discount"
                v={`− ${formatCurrency(inv.discountCents, cur)}`}
              />
            )}
            {inv.pointsRedeemedCents > 0 && (
              <Row
                k="Reward points"
                v={`− ${formatCurrency(inv.pointsRedeemedCents, cur)}`}
              />
            )}
            <Row
              k={inv.taxLabel ?? "Tax"}
              v={formatCurrency(inv.taxCents, cur)}
            />
            <div
              className="!mt-3 flex items-center justify-between border-t pt-3"
              style={{ borderColor: "var(--ed-line)" }}
            >
              <span
                className="font-bold"
                style={{ color: "var(--ed-ink)" }}
              >
                Total paid
              </span>
              <span
                className="text-lg font-extrabold"
                style={{ color: "var(--ed-ink)" }}
              >
                {formatCurrency(inv.totalCents, cur)}
              </span>
            </div>
          </div>

          <div
            className="mt-10 border-t pt-5 text-[11px] leading-relaxed"
            style={{ borderColor: "var(--ed-line)", color: "var(--ed-mute)" }}
          >
            This receipt is issued by {inv.sellerName} for a purchase made on
            the eurodigital.coach marketplace. Amounts are in {cur}. For a
            formal tax invoice with seller registration details, contact the
            institute directly.
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: "var(--ed-mute)" }}>{k}</span>
      <span className="font-semibold" style={{ color: "var(--ed-ink)" }}>
        {v}
      </span>
    </div>
  );
}
