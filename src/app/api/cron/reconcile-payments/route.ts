import { NextResponse } from "next/server";
import { runReconciliation } from "@/lib/payments/reconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Payment reconciliation backstop (recover stuck-paid orders, fail stale
 * ones, repair partially-fulfilled ones). Protected by CRON_SECRET — Vercel
 * Cron auto-sends `Authorization: Bearer $CRON_SECRET`. Fails closed if the
 * secret is missing (same posture as expire-points / the Clerk webhook).
 */
export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured — refusing to run." },
      { status: 503 },
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runReconciliation();
  return NextResponse.json({ ok: true, ...result });
}
