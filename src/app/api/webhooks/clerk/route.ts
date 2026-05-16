import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { headers } from "next/headers";
import { db } from "@/db/client";
import { users, students, enrollments } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  isAdminRole,
  isStudentRole,
  CANONICAL_ADMIN,
  CANONICAL_STUDENT,
  type RawRole,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

type ClerkUserCreated = {
  type: "user.created" | "user.updated" | "user.deleted";
  data: {
    id: string;
    email_addresses?: Array<{ id: string; email_address: string }>;
    primary_email_address_id?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string | null;
    public_metadata?: {
      role?: "admin" | "student";
      enrollmentId?: string;
      invitedPermissions?: string[];
    };
  };
};

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CLERK_WEBHOOK_SECRET not configured" }, { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();

  let event: ClerkUserCreated;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserCreated;
  } catch (err) {
    console.error("Clerk webhook signature failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event.type !== "user.created" && event.type !== "user.updated") {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const { data } = event;
  const primaryEmail =
    data.email_addresses?.find((e) => e.id === data.primary_email_address_id)?.email_address ??
    data.email_addresses?.[0]?.email_address;
  if (!primaryEmail) {
    return NextResponse.json({ error: "No email on user" }, { status: 400 });
  }

  // Normalize incoming Clerk metadata role to a canonical DB role. Legacy
  // lowercase (admin/student/coach) → UPPERCASE; super/instructor pass through.
  const rawMetaRole = (data.public_metadata?.role as string | undefined) ?? "student";
  const role: RawRole = isAdminRole(rawMetaRole)
    ? CANONICAL_ADMIN
    : isStudentRole(rawMetaRole)
      ? CANONICAL_STUDENT
      : (rawMetaRole as RawRole);
  const isAdmin = isAdminRole(role);
  const isStudent = isStudentRole(role);
  const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ").trim() || null;
  const invitedPermissions = isAdmin ? (data.public_metadata?.invitedPermissions ?? []) : [];

  // Upsert users row
  const existing = await db.select().from(users).where(eq(users.clerkId, data.id)).limit(1);
  let userId: string;
  if (existing.length === 0) {
    const [row] = await db
      .insert(users)
      .values({
        clerkId: data.id,
        email: primaryEmail,
        fullName,
        avatarUrl: data.image_url ?? null,
        role,
        permissions: invitedPermissions,
      })
      .returning({ id: users.id });
    userId = row.id;
  } else {
    userId = existing[0].id;
    await db
      .update(users)
      .set({
        email: primaryEmail,
        fullName,
        avatarUrl: data.image_url ?? null,
        role,
        ...(isAdmin && invitedPermissions.length > 0
          ? { permissions: invitedPermissions }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // If they're a student, create the student row (idempotent) + link enrollment
  if (isStudent) {
    const enrollmentId = data.public_metadata?.enrollmentId;
    const existingStudent = await db
      .select()
      .from(students)
      .where(eq(students.userId, userId))
      .limit(1);
    if (existingStudent.length === 0) {
      await db.insert(students).values({
        userId,
        enrollmentId: enrollmentId ?? null,
      });
    }
    if (enrollmentId) {
      await db
        .update(enrollments)
        .set({ userId, status: "account_created", updatedAt: new Date() })
        .where(eq(enrollments.id, enrollmentId));
    }
  }

  return NextResponse.json({ received: true, userId, role });
}
