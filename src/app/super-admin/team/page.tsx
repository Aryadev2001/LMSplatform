import { inArray, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireSuper, type SuperRole } from "@/lib/auth";
import { canManageTeam, SUPER_ROLE_LABEL } from "@/lib/super";
import { formatDate } from "@/lib/format";
import { InviteMemberDialog } from "./invite-member-dialog";

export const dynamic = "force-dynamic";

export default async function SuperTeamPage() {
  const me = await requireSuper();
  const isOwner = canManageTeam(me.rawRole as SuperRole);

  const team = await db
    .select({
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(inArray(users.role, ["SUPER_OWNER", "SUPER_STAFF", "SUPER_SUPPORT"]))
    .orderBy(desc(users.createdAt));

  return (
    <div>
      <PageHeader
        eyebrow="Super Admin"
        title="Super-admin team"
        description="EDT operators above all tenants. Owner manages membership."
        actions={isOwner ? <InviteMemberDialog /> : undefined}
      />

      {!isOwner && (
        <p className="mb-4 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          Only the Owner can invite or change super-admin members. This list is read-only for you.
        </p>
      )}

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Since</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.map((m) => (
              <TableRow key={m.email}>
                <TableCell className="font-medium">{m.fullName ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{m.email}</TableCell>
                <TableCell>
                  <Badge variant={m.role === "SUPER_OWNER" ? "default" : "secondary"}>
                    {SUPER_ROLE_LABEL[m.role as SuperRole] ?? m.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(m.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
