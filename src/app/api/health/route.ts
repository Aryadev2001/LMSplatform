import { NextResponse } from "next/server";

/**
 * Cheap liveness probe. No DB round-trip — just confirms the Next runtime
 * is up and responding. Used by uptime monitors + the load-test
 * deploy-wait loop. Keep it stateless so a Neon outage doesn't fail this
 * check (use a separate /api/ready if you want a deep health check).
 */
export const runtime = "edge";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "eurodigital.coach",
    sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    ts: Date.now(),
  });
}
