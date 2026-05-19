import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { tenants, users } from "@/db/schema";
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
import { canWrite } from "@/lib/super";
import { formatDate } from "@/lib/format";
import { CreateTenantDialog } from "./create-tenant-dialog";
import { OpenAsTenantButton } from "./[tenantId]/open-as-tenant-button";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  ACTIVE: "default",
  TRIAL: "secondary",
  SUSPENDED: "destructive",
  CHURNED: "outline",
};

export default async function SuperTenantsPage() {
  const me = await requireSuper();
  const writable = canWrite(me.rawRole as SuperRole);

  const rows = await db
    .select({
      id: tenants.id,
      slug: tenants.slug,
      name: tenants.name,
      status: tenants.status,
      createdAt: tenants.createdAt,
      userCount: sql<number>`(select count(*)::int from ${users} u where u.tenant_id = ${tenants.id})`,
    })
    .from(tenants)
    .orderBy(desc(tenants.createdAt));

  return (
    <div>
      <PageHeader
        eyebrow="Super Admin"
        title="Tenants"
        description="Every institute on the platform. Data is row-isolated by tenant."
        actions={writable ? <CreateTenantDialog /> : undefined}
      />

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Subdomain</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No tenants yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <Link
                    href={`/super-admin/tenants/${t.id}`}
                    className="font-medium hover:underline"
                  >
                    {t.name}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {t.slug}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[t.status] ?? "outline"}>{t.status}</Badge>
                </TableCell>
                <TableCell>{t.userCount}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(t.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <OpenAsTenantButton
                    tenantId={t.id}
                    disabled={!writable}
                    label="Open"
                    size="sm"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
