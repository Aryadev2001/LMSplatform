import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, users } from "@/db/schema";
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
import { requireSuper } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SuperAuditPage() {
  await requireSuper(); // any super may read the audit log

  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      targetType: auditLogs.targetType,
      targetId: auditLogs.targetId,
      actorRole: auditLogs.actorRole,
      actorEmail: users.email,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorUserId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(200);

  return (
    <div>
      <PageHeader
        eyebrow="Super Admin"
        title="Audit log"
        description="Immutable record of every super-admin write. Most recent 200 events."
      />

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No audit events yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {r.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                </TableCell>
                <TableCell className="text-sm">
                  {r.actorEmail ?? "—"}{" "}
                  <Badge variant="outline" className="ml-1">
                    {r.actorRole}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{r.action}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.targetType}:{r.targetId}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.ipAddress ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
