import "dotenv/config";
import { createClerkClient } from "@clerk/backend";
import { db } from "../src/db/client";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";

const EMAIL = "aryaabinash2001@gmail.com";

async function run() {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

  // Revoke any pending invitations for a clean slate
  const invites = await clerk.invitations.getInvitationList();
  for (const inv of invites.data.filter((i) => i.emailAddress === EMAIL && i.status === "pending")) {
    try {
      await clerk.invitations.revokeInvitation(inv.id);
      console.log(`Revoked pending invitation ${inv.id}`);
    } catch {
      /* ignore */
    }
  }

  // If a user already exists, just ensure role + DB row
  const existingList = await clerk.users.getUserList({ emailAddress: [EMAIL] });
  let clerkUser = existingList.data[0];

  if (clerkUser) {
    console.log(`User already exists (${clerkUser.id}) — ensuring admin role`);
    await clerk.users.updateUserMetadata(clerkUser.id, {
      publicMetadata: { ...(clerkUser.publicMetadata ?? {}), role: "admin" },
    });
  } else {
    clerkUser = await clerk.users.createUser({
      emailAddress: [EMAIL],
      publicMetadata: { role: "admin" },
      skipPasswordRequirement: true,
      skipPasswordChecks: true,
    });
    console.log(`✅ Created Clerk user ${clerkUser.id}`);
  }

  // Mark the email as verified so email-code sign-in is frictionless
  const emailObj = clerkUser.emailAddresses.find((e) => e.emailAddress === EMAIL);
  if (emailObj && emailObj.verification?.status !== "verified") {
    try {
      // Re-create as verified via update is not directly supported; safe to ignore.
      console.log(`(email verification status: ${emailObj.verification?.status ?? "unknown"})`);
    } catch {
      /* ignore */
    }
  }

  // Upsert DB users row
  const dbRows = await db.select().from(users).where(eq(users.clerkId, clerkUser.id)).limit(1);
  if (dbRows.length === 0) {
    await db.insert(users).values({
      clerkId: clerkUser.id,
      email: EMAIL,
      fullName:
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() || null,
      avatarUrl: clerkUser.imageUrl ?? null,
      role: "admin",
    });
    console.log("✅ Inserted DB users row (role=admin)");
  } else {
    await db
      .update(users)
      .set({ role: "admin", updatedAt: new Date() })
      .where(eq(users.clerkId, clerkUser.id));
    console.log("✅ Updated DB users row (role=admin)");
  }

  console.log(`\nDone. Now go to http://localhost:3000/admin/login`);
  console.log(`Type: ${EMAIL}`);
  console.log(`Clerk will email a 6-digit code (or show a code field). Enter it → /admin\n`);
}

run().then(() => process.exit(0)).catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
