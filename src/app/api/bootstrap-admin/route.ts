import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAllowedToBootstrap } from "@/lib/admin-allowlist";
import { CANONICAL_ADMIN } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const bootstrapSecret = process.env.BOOTSTRAP_SECRET;
  if (!bootstrapSecret) {
    return NextResponse.json({ error: "BOOTSTRAP_SECRET not configured" }, { status: 500 });
  }

  let payload: { email?: string; secret?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, secret } = payload;
  if (!email || !secret) {
    return NextResponse.json(
      { error: "Both 'email' and 'secret' are required" },
      { status: 400 },
    );
  }

  if (secret !== bootstrapSecret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  if (!isAllowedToBootstrap(email)) {
    return NextResponse.json(
      {
        error:
          "This email is not in the admin allowlist. Once the initial admin is signed in, they can promote additional admins from the dashboard.",
      },
      { status: 403 },
    );
  }

  const clerk = await clerkClient();
  const matching = await clerk.users.getUserList({ emailAddress: [email] });
  const clerkUser = matching.data[0];

  // CASE A — Clerk user doesn't exist yet: send an invitation with admin role
  if (!clerkUser) {
    try {
      const invitation = await clerk.invitations.createInvitation({
        emailAddress: email,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/accept-invite`,
        publicMetadata: { role: CANONICAL_ADMIN },
        notify: true,
      });
      return NextResponse.json({
        success: true,
        invited: true,
        invitationId: invitation.id,
        email,
        message:
          "Invitation sent. Check your inbox for a magic link — clicking it will create your admin account and sign you in.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send invitation";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // CASE B — Clerk user exists: just promote them
  await clerk.users.updateUserMetadata(clerkUser.id, {
    publicMetadata: { ...(clerkUser.publicMetadata ?? {}), role: CANONICAL_ADMIN },
  });

  const primaryEmail =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress ?? email;
  const fullName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() || null;

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkUser.id))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(users).values({
      clerkId: clerkUser.id,
      email: primaryEmail,
      fullName,
      avatarUrl: clerkUser.imageUrl,
      role: CANONICAL_ADMIN,
    });
  } else {
    await db
      .update(users)
      .set({ role: CANONICAL_ADMIN, updatedAt: new Date() })
      .where(eq(users.clerkId, clerkUser.id));
  }

  return NextResponse.json({
    success: true,
    invited: false,
    clerkUserId: clerkUser.id,
    email: primaryEmail,
    role: CANONICAL_ADMIN,
    message:
      "Admin role assigned. Sign out and sign back in via /admin/login to load the new role.",
  });
}
