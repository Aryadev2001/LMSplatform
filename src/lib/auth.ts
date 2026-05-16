import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export type UserRole = "admin" | "student";

/**
 * Resolves the current user's role. Wrapped in React cache() so multiple
 * calls within a single request (layout + page) hit the DB at most once.
 *
 * Order of truth:
 * 1. Clerk session-token claim `metadata.role` (no DB hit) — requires the
 *    Clerk "Customize session token" config.
 * 2. Fallback: our DB by clerkId (always works, single indexed query).
 * 3. Last resort: Clerk publicMetadata.
 */
export const getCurrentUser = cache(async () => {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;

  const claimRole = (sessionClaims?.metadata as { role?: UserRole } | undefined)?.role;
  if (claimRole) {
    return { userId, role: claimRole, email: undefined as string | undefined };
  }

  const dbRow = await db
    .select({ role: users.role, email: users.email })
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);
  if (dbRow.length > 0) {
    return { userId, role: dbRow[0].role as UserRole, email: dbRow[0].email };
  }

  try {
    const cu = await currentUser();
    const metaRole = (cu?.publicMetadata as { role?: UserRole } | undefined)?.role;
    if (metaRole) return { userId, role: metaRole, email: undefined };
  } catch {
    /* ignore */
  }

  return { userId, role: null as UserRole | null, email: undefined };
});

export async function requireRole(allowed: UserRole | UserRole[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const allowedList = Array.isArray(allowed) ? allowed : [allowed];
  if (!user.role || (!allowedList.includes(user.role) && user.role !== "admin")) {
    redirect("/forbidden");
  }
  return user;
}
