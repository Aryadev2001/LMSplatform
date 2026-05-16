"use server";

import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole, getCurrentUser, CANONICAL_ADMIN } from "@/lib/auth";
import { ADMIN_PERMISSIONS, type AdminPermission } from "@/lib/permissions";

async function requireManageAdmins() {
  const me = await requireRole("admin");
  const [row] = await db
    .select({ isSuperAdmin: users.isSuperAdmin, permissions: users.permissions })
    .from(users)
    .where(eq(users.clerkId, me.userId))
    .limit(1);
  const canManage =
    row?.isSuperAdmin || (row?.permissions ?? []).includes("manage_admins");
  if (!canManage) {
    return { ok: false as const, error: "You don't have permission to manage admins." };
  }
  return { ok: true as const, me };
}

const PermsSchema = z.array(z.enum(ADMIN_PERMISSIONS));

const AddAdminSchema = z.object({
  email: z.email("Enter a valid email"),
  fullName: z.string().max(200).optional().or(z.literal("")),
  permissions: PermsSchema,
});

export type AddAdminResult = { success: true; email: string } | { success: false; error: string };

export async function addAdmin(input: z.infer<typeof AddAdminSchema>): Promise<AddAdminResult> {
  const gate = await requireManageAdmins();
  if (!gate.ok) return { success: false, error: gate.error };

  const parsed = AddAdminSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { email, fullName, permissions } = parsed.data;

  const clerk = await clerkClient();
  const existing = await clerk.users.getUserList({ emailAddress: [email] });
  const clerkUser = existing.data[0];

  if (clerkUser) {
    // Promote existing user
    await clerk.users.updateUserMetadata(clerkUser.id, {
      publicMetadata: { ...(clerkUser.publicMetadata ?? {}), role: CANONICAL_ADMIN },
    });
    const dbRow = await db.select().from(users).where(eq(users.clerkId, clerkUser.id)).limit(1);
    if (dbRow.length === 0) {
      await db.insert(users).values({
        clerkId: clerkUser.id,
        email,
        fullName: fullName || null,
        role: CANONICAL_ADMIN,
        isSuperAdmin: false,
        permissions,
      });
    } else {
      await db
        .update(users)
        .set({ role: CANONICAL_ADMIN, isSuperAdmin: false, permissions, updatedAt: new Date() })
        .where(eq(users.clerkId, clerkUser.id));
    }
  } else {
    // Invite new admin
    try {
      await clerk.invitations.createInvitation({
        emailAddress: email,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/admin`,
        publicMetadata: { role: CANONICAL_ADMIN, invitedPermissions: permissions },
        notify: true,
      });
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to send invitation",
      };
    }
  }

  revalidatePath("/admin/settings");
  return { success: true, email };
}

export async function updateAdminPermissions(
  targetUserId: string,
  permissions: AdminPermission[],
) {
  const gate = await requireManageAdmins();
  if (!gate.ok) return { success: false as const, error: gate.error };

  const parsed = PermsSchema.safeParse(permissions);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid permissions" };
  }

  const [target] = await db
    .select({ isSuperAdmin: users.isSuperAdmin })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);
  if (target?.isSuperAdmin) {
    return { success: false as const, error: "Super admin permissions can't be changed." };
  }

  await db
    .update(users)
    .set({ permissions: parsed.data, updatedAt: new Date() })
    .where(eq(users.id, targetUserId));
  revalidatePath("/admin/settings");
  return { success: true as const };
}

export async function removeAdmin(targetUserId: string) {
  const gate = await requireManageAdmins();
  if (!gate.ok) return { success: false as const, error: gate.error };

  const me = await getCurrentUser();
  const [target] = await db
    .select({ clerkId: users.clerkId, isSuperAdmin: users.isSuperAdmin })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  if (!target) return { success: false as const, error: "Admin not found" };
  if (target.isSuperAdmin) {
    return { success: false as const, error: "The super admin can't be removed." };
  }
  if (me && target.clerkId === me.userId) {
    return { success: false as const, error: "You can't remove yourself." };
  }

  // Demote: remove admin role in Clerk + delete our DB row
  const clerk = await clerkClient();
  try {
    await clerk.users.updateUserMetadata(target.clerkId, {
      publicMetadata: { role: null },
    });
  } catch {
    /* ignore — Clerk user may already be gone */
  }
  await db.delete(users).where(eq(users.id, targetUserId));

  revalidatePath("/admin/settings");
  return { success: true as const };
}
