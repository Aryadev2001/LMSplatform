import { NextResponse } from "next/server";
import { expireOldPoints } from "@/lib/referral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily job — expire referral points older than 12 months (FIFO).
 * Protected by CRON_SECRET. Vercel Cron auto-sends
 * `Authorization: Bearer $CRON_SECRET` when the env var is set. Fails closed
 * if the secret is missing (same posture as the Clerk webhook).
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

  const result = await expireOldPoints();
  return NextResponse.json({ ok: true, ...result });
}
