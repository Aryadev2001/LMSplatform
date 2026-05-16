import "dotenv/config";
import { createClerkClient } from "@clerk/backend";
import { db } from "../src/db/client";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";

const EMAIL = (process.env.SUPER_OWNER_EMAIL ?? "arya@closerx.ai").toLowerCase();

async function run() {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

  const existing = await clerk.users.getUserList({ emailAddress: [EMAIL] });
  let clerkUser = existing.data[0];

  if (clerkUser) {
    await clerk.users.updateUserMetadata(clerkUser.id, {
      publicMetadata: { ...(clerkUser.publicMetadata ?? {}), role: "SUPER_OWNER" },
    });
    console.log(`Clerk user exists (${clerkUser.id}) — set role=SUPER_OWNER`);
  } else {
    clerkUser = await clerk.users.createUser({
      emailAddress: [EMAIL],
      publicMetadata: { role: "SUPER_OWNER" },
      skipPasswordRequirement: true,
      skipPasswordChecks: true,
    });
    console.log(`Created Clerk user ${clerkUser.id} for ${EMAIL}`);
  }

  const dbRow = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkUser.id))
    .limit(1);

  if (dbRow.length === 0) {
    await db.insert(users).values({
      clerkId: clerkUser.id,
      email: EMAIL,
      fullName: "EDT Platform Owner",
      role: "SUPER_OWNER",
      isSuperAdmin: true,
      tenantId: null, // sits above all tenants
    });
    console.log("Inserted DB users row: SUPER_OWNER, tenantId=NULL");
  } else {
    await db
      .update(users)
      .set({ role: "SUPER_OWNER", isSuperAdmin: true, tenantId: null, updatedAt: new Date() })
      .where(eq(users.clerkId, clerkUser.id));
    console.log("Updated DB users row: SUPER_OWNER, tenantId=NULL");
  }

  console.log(`\n✓ ${EMAIL} is the platform SUPER_OWNER. Sign in via /admin/login (email code).`);
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
