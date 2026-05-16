import { db } from "@/db/client";
import { users, tenants } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole, getCurrentUser, ADMIN_DB_ROLES } from "@/lib/auth";
import { PERMISSION_LABELS, type AdminPermission, hasPermission } from "@/lib/permissions";
import { initialsOf, formatDate } from "@/lib/format";
import { AddAdminDialog } from "./add-admin-dialog";
import { AdminRowActions } from "./admin-row-actions";
import { TenantBrandingForm } from "./tenant-branding-form";
import { CustomDomainForm } from "./custom-domain-form";
import { ShieldCheck, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireRole("admin");
  const me = await getCurrentUser();

  const [adminRows, meRow] = await Promise.all([
    db
      .select({
        id: users.id,
        clerkId: users.clerkId,
        email: users.email,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        isSuperAdmin: users.isSuperAdmin,
        permissions: users.permissions,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(inArray(users.role, [...ADMIN_DB_ROLES]))
      .orderBy(desc(users.isSuperAdmin), desc(users.createdAt)),
    me
      ? db
          .select({
            fullName: users.fullName,
            email: users.email,
            avatarUrl: users.avatarUrl,
            isSuperAdmin: users.isSuperAdmin,
            permissions: users.permissions,
          })
          .from(users)
          .where(eq(users.clerkId, me.userId))
          .limit(1)
      : Promise.resolve([]),
  ]);

  const profile = meRow[0];
  const canManageAdmins = hasPermission(profile, "manage_admins");

  const myTenantId = me?.tenantId ?? null;
  const tenantRow = myTenantId
    ? (
        await db
          .select({
            name: tenants.name,
            logoUrl: tenants.logoUrl,
            brandPrimaryColor: tenants.brandPrimaryColor,
            brandSecondaryColor: tenants.brandSecondaryColor,
            heroTagline: tenants.heroTagline,
            customDomain: tenants.customDomain,
            customDomainStatus: tenants.customDomainStatus,
          })
          .from(tenants)
          .where(eq(tenants.id, myTenantId))
          .limit(1)
      )[0]
    : undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow="— Settings"
        title="Workspace settings"
        description="Your profile, and who else can administer this platform."
      />

      {/* Profile card */}
      <Card className="border-none bg-card shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Your profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              {profile?.avatarUrl && <AvatarImage src={profile.avatarUrl} />}
              <AvatarFallback className="bg-foreground/5 text-base">
                {initialsOf(profile?.fullName ?? profile?.email ?? "?")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold">
                  {profile?.fullName ?? "Admin"}
                </span>
                {profile?.isSuperAdmin && (
                  <Badge variant="default" className="gap-1 font-normal">
                    <ShieldCheck className="size-3" />
                    Super admin
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">{profile?.email}</div>
            </div>
          </div>
          {!profile?.isSuperAdmin && (
            <div className="mt-5 space-y-2">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Your permissions
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(profile?.permissions ?? []).length === 0 ? (
                  <span className="text-xs text-muted-foreground">No permissions assigned</span>
                ) : (
                  (profile?.permissions ?? []).map((p) => (
                    <Badge key={p} variant="secondary" className="font-normal">
                      {PERMISSION_LABELS[p as AdminPermission]?.label ?? p}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Whitelabel / branding */}
      {tenantRow && (
        <Card className="border-none bg-card shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Branding</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Your logo and colors. These apply across your students&apos; and
              your own dashboards instantly.
            </p>
          </CardHeader>
          <CardContent>
            <TenantBrandingForm
              initial={{
                logoUrl: tenantRow.logoUrl,
                brandPrimaryColor: tenantRow.brandPrimaryColor,
                brandSecondaryColor: tenantRow.brandSecondaryColor,
                heroTagline: tenantRow.heroTagline ?? "",
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Custom domain */}
      {tenantRow && (
        <Card className="border-none bg-card shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Custom domain</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Run your portal on your own domain. Requests are reviewed and the
              DNS is configured manually — it goes live once approved.
            </p>
          </CardHeader>
          <CardContent>
            <CustomDomainForm
              currentDomain={tenantRow.customDomain}
              status={tenantRow.customDomainStatus}
            />
          </CardContent>
        </Card>
      )}

      {/* Admins management */}
      <Card className="border-none bg-card shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Admins</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {canManageAdmins
                ? "Add admins and control exactly what each can do."
                : "You can view admins but need the “Manage admins” permission to change them."}
            </p>
          </div>
          {canManageAdmins && <AddAdminDialog />}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Admin</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="text-right">Added</TableHead>
                <TableHead className="pr-6 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminRows.map((a) => {
                const isSelf = me?.userId === a.clerkId;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          {a.avatarUrl && <AvatarImage src={a.avatarUrl} />}
                          <AvatarFallback className="bg-secondary text-xs">
                            {initialsOf(a.fullName ?? a.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate text-sm font-medium">
                            {a.fullName ?? "—"}
                            {isSelf && (
                              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                                you
                              </span>
                            )}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">{a.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {a.isSuperAdmin ? (
                        <Badge variant="default" className="gap-1 font-normal">
                          <ShieldCheck className="size-3" />
                          All permissions
                        </Badge>
                      ) : a.permissions.length === 0 ? (
                        <span className="text-xs text-muted-foreground">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {a.permissions.slice(0, 3).map((p) => (
                            <Badge key={p} variant="secondary" className="font-normal">
                              {PERMISSION_LABELS[p as AdminPermission]?.label ?? p}
                            </Badge>
                          ))}
                          {a.permissions.length > 3 && (
                            <Badge variant="secondary" className="font-normal">
                              +{a.permissions.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatDate(a.createdAt)}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      {canManageAdmins ? (
                        <AdminRowActions
                          userId={a.id}
                          name={a.fullName ?? a.email}
                          isSuperAdmin={a.isSuperAdmin}
                          currentPermissions={a.permissions}
                          isSelf={isSelf}
                        />
                      ) : (
                        <Lock className="ml-auto size-3.5 text-muted-foreground" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
