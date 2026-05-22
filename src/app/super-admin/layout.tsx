import { eq } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireSuper } from "@/lib/auth";
import { db } from "@/db/client";
import { users } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireSuper(); // SUPER_SUPPORT and up; redirects /forbidden otherwise
  const [meRow] = await db
    .select({ fullName: users.fullName, email: users.email })
    .from(users)
    .where(eq(users.clerkId, auth.userId))
    .limit(1);
  return (
    <DashboardShell
      role="super"
      title="Super Admin"
      account={
        meRow
          ? {
              displayName: meRow.fullName ?? meRow.email,
              email: meRow.email,
            }
          : undefined
      }
    >
      {children}
    </DashboardShell>
  );
}
