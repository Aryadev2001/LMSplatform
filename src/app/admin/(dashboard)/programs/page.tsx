import Link from "next/link";
import { db } from "@/db/client";
import { programs } from "@/db/schema";
import { desc, ilike } from "drizzle-orm";
import { PageHeader } from "@/components/dashboard/page-header";
import { TableToolbar } from "@/components/dashboard/table-toolbar";
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
import { ProgramDialog } from "./program-dialog";
import { formatCurrency, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const search = q?.trim();
  const rows = await db
    .select()
    .from(programs)
    .where(search ? ilike(programs.name, `%${search}%`) : undefined)
    .orderBy(desc(programs.createdAt));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="— Programs"
        title="Coaching programs"
        description="The packages students can enroll in. Set pricing and duration here."
        actions={<ProgramDialog mode="create" />}
      />

      <div className="mb-4">
        <TableToolbar searchPlaceholder="Search programs by name…" />
      </div>

      <Card className="border-none bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Created</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  No programs yet. Create your first one to start accepting enrollments.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{p.name}</div>
                      {p.description && (
                        <div className="line-clamp-1 text-xs text-muted-foreground">
                          {p.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(p.priceCents, p.currency)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {p.durationMonths} mo
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.isActive ? "default" : "secondary"} className="font-normal">
                      {p.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatDate(p.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/programs/${p.id}`}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        Manage content
                      </Link>
                      <ProgramDialog
                        mode="edit"
                        initial={{
                          id: p.id,
                          name: p.name,
                          description: p.description,
                          priceCents: p.priceCents,
                          currency: p.currency,
                          durationMonths: p.durationMonths,
                          isActive: p.isActive,
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
