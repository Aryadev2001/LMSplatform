import Link from "next/link";
import { CheckCircle2, ArrowRight, Sparkles, XCircle } from "lucide-react";
import { EuroNav } from "@/components/euro/euro-nav";
import { EuroFooter } from "@/components/euro/euro-footer";
import { confirmCheckout } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Order confirmed — eurodigital.coach" };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    ref?: string;
    items?: string;
    provider?: string;
    order?: string;
    session_id?: string;
  }>;
}) {
  const sp = await searchParams;
  let { ref, items } = sp;
  let failed: string | null = null;

  // Stripe returns here after hosted Checkout — confirm + grant access now
  // (Razorpay/mock are already confirmed before redirect).
  if (sp.provider === "stripe" && sp.order && sp.session_id) {
    const c = await confirmCheckout({
      provider: "stripe",
      orderId: sp.order,
      sessionId: sp.session_id,
    });
    if (c.success) {
      ref = c.orderRef;
      items = String(c.items);
    } else {
      failed = c.error;
    }
  }

  if (failed) {
    return (
      <div style={{ background: "var(--ed-bg)" }} className="min-h-screen">
        <EuroNav />
        <main className="mx-auto max-w-lg px-6 py-20">
          <div
            className="rounded-3xl border bg-white p-10 text-center shadow-sm"
            style={{ borderColor: "var(--ed-line)" }}
          >
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <XCircle className="size-7" />
            </div>
            <h1
              className="mt-5 text-2xl font-extrabold"
              style={{ color: "var(--ed-ink)" }}
            >
              Payment not confirmed
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--ed-mute)" }}>
              {failed} No access was granted and you have not been charged
              twice — your cart is saved.
            </p>
            <Link
              href="/cart"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white"
              style={{ background: "var(--ed-gradient)" }}
            >
              Back to cart <ArrowRight className="size-4" />
            </Link>
          </div>
        </main>
        <EuroFooter />
      </div>
    );
  }

  return (
    <div style={{ background: "var(--ed-bg)" }} className="min-h-screen">
      <EuroNav />
      <main className="mx-auto max-w-lg px-6 py-20">
        <div
          className="rounded-3xl border bg-white p-10 text-center shadow-sm"
          style={{ borderColor: "var(--ed-line)" }}
        >
          <div
            className="mx-auto flex size-14 items-center justify-center rounded-2xl text-white"
            style={{ background: "var(--ed-gradient)" }}
          >
            <CheckCircle2 className="size-7" />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold" style={{ color: "var(--ed-ink)" }}>
            Order confirmed
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--ed-mute)" }}>
            {items ? `${items} item(s) enrolled.` : "Enrollment complete."}{" "}
            Access has been granted to your account.
          </p>
          {ref && (
            <p
              className="mt-3 rounded-xl border px-3 py-2 font-mono text-xs"
              style={{ borderColor: "var(--ed-line)", color: "var(--ed-ink-2)" }}
            >
              Order {ref}
            </p>
          )}
          <p className="mt-3 text-[11px]" style={{ color: "var(--ed-mute)" }}>
            Test mode — no real charge. A real receipt/invoice is issued once
            live payment processing is wired.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/student/courses"
              className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white"
              style={{ background: "var(--ed-gradient)" }}
            >
              Start learning <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/student/ai-services"
              className="flex items-center justify-center gap-2 rounded-xl border px-6 py-3 text-sm font-semibold"
              style={{ borderColor: "var(--ed-line)", color: "var(--ed-ink-2)" }}
            >
              <Sparkles className="size-4" /> Explore AI Services
            </Link>
          </div>
        </div>
      </main>
      <EuroFooter />
    </div>
  );
}
