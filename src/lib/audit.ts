import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, auditLogs } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

/**
 * Record an immutable audit entry. Acceptance criterion #13: every
 * super-admin write must be audited. Resolves the actor's DB uuid + raw role
 * from the current Clerk session. Best-effort IP from forwarded headers.
 *
 * Returns true if written. Never throws into the caller's happy path — an
 * audit failure must not silently *also* let the write proceed unaudited, so
 * callers should `await` this and treat `false` as "abort the write".
 */
export async function recordAudit(entry: {
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  const me = await getCurrentUser();
  if (!me || !me.rawRole) return false;

  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, me.userId))
    .limit(1);
  if (!row) return false;

  let ip: string | null = null;
  try {
    const h = await headers();
    ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      null;
  } catch {
    ip = null;
  }

  await db.insert(auditLogs).values({
    actorUserId: row.id,
    actorRole: me.rawRole,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    metadataJson: entry.metadata ?? null,
    ipAddress: ip,
  });
  return true;
}
