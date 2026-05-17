import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { domainRequests, tenants } from "@/db/schema";
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
import { dnsRecordsFor } from "@/lib/dns";
import { DomainRowActions } from "./domain-row-actions";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "secondary",
  IN_PROGRESS: "secondary",
  CONFIGURED: "default",
  REJECTED: "destructive",
};

export default async function SuperDomainsPage() {
  const me = await requireSuper();
  const writable = canWrite(me.rawRole as SuperRole);

  const rows = await db
    .select({
      id: domainRequests.id,
      domain: domainRequests.domain,
      status: domainRequests.status,
      requestedAt: domainRequests.requestedAt,
      actionedAt: domainRequests.actionedAt,
      notes: domainRequests.notes,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
    })
    .from(domainRequests)
    .leftJoin(tenants, eq(tenants.id, domainRequests.tenantId))
    .orderBy(desc(domainRequests.requestedAt))
    .limit(200);

  const pending = rows.filter((r) => r.status === "PENDING" || r.status === "IN_PROGRESS");

  return (
    <div>
      <PageHeader
        eyebrow="Super Admin"
        title="Custom domain queue"
        description="Manual DNS workflow: add the domain in the Vercel dashboard, then mark it configured here."
      />

      <div className="mb-6 rounded-xl border border-black/5 bg-secondary/40 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">{pending.length}</strong> request
        {pending.length === 1 ? "" : "s"} awaiting action. For each: in Vercel →
        Project → Domains, add the domain and point DNS (CNAME →{" "}
        <span className="font-mono">cname.vercel-dns.com</span>), then “Mark
        configured”. Resolution goes live only after that.
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Domain</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Actioned</TableHead>
              <TableHead className="text-right pr-6">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No domain requests yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">
                  {r.domain}
                  {(r.status === "PENDING" || r.status === "IN_PROGRESS") && (
                    <div className="mt-1 space-y-0.5 font-normal text-[10px] text-muted-foreground">
                      {dnsRecordsFor(r.domain).map((rec, i) => (
                        <div key={i}>
                          <span className="font-mono">{rec.type}</span>{" "}
                          <span className="font-mono">{rec.name}</span> →{" "}
                          <span className="font-mono">{rec.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {r.tenantName ?? "—"}{" "}
                  <span className="text-xs text-muted-foreground">/{r.tenantSlug}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>{r.status}</Badge>
                  {r.notes && (
                    <div className="mt-1 text-[11px] text-muted-foreground">{r.notes}</div>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(r.requestedAt)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.actionedAt ? formatDate(r.actionedAt) : "—"}
                </TableCell>
                <TableCell className="pr-6 text-right">
                  {writable && (r.status === "PENDING" || r.status === "IN_PROGRESS") ? (
                    <DomainRowActions requestId={r.id} domain={r.domain} />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
