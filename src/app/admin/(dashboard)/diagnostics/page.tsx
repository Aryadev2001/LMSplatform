import Link from "next/link";
import { db } from "@/db/client";
import { diagnosticSubmissions, users } from "@/db/schema";
import { desc, and, or, ilike, eq, type SQL } from "drizzle-orm";
import { requireTenantId } from "@/lib/tenant";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
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
import { EmptyState } from "@/components/dashboard/empty-state";
import { TableToolbar } from "@/components/dashboard/table-toolbar";
import { formatDate } from "@/lib/format";
import { Activity } from "lucide-react";

export const dynamic = "force-dynamic";

const STAGE_FILTERS = [
  { value: "all", label: "All" },
  { value: "foundation", label: "Foundation" },
  { value: "growth", label: "Growth" },
  { value: "scale", label: "Scale" },
];

export default async function AdminDiagnosticsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string }>;
}) {
  const { q, stage } = await searchParams;
  const tenantId = await requireTenantId();
  const search = q?.trim();
  const validStages = ["foundation", "growth", "scale"];

  // Scoped to submitters in this tenant. NOTE: anonymous public diagnostics
  // (no userId) are not tenant-attributable yet — diagnostic_submissions has
  // no tenantId column. Adding one is a separate schema task (flagged).
  const conditions: SQL[] = [eq(users.tenantId, tenantId)];
  if (search) {
    const s = or(
      ilike(diagnosticSubmissions.name, `%${search}%`),
      ilike(diagnosticSubmissions.email, `%${search}%`),
    );
    if (s) conditions.push(s);
  }
  if (stage && validStages.includes(stage)) {
    conditions.push(eq(diagnosticSubmissions.stage, stage as "foundation" | "growth" | "scale"));
  }

  const rows = await db
    .select({
      id: diagnosticSubmissions.id,
      name: diagnosticSubmissions.name,
      email: diagnosticSubmissions.email,
      bhs: diagnosticSubmissions.businessHealthScore,
      stage: diagnosticSubmissions.stage,
      recommended: diagnosticSubmissions.recommendedCourseSlug,
      createdAt: diagnosticSubmissions.createdAt,
    })
    .from(diagnosticSubmissions)
    .innerJoin(users, eq(users.id, diagnosticSubmissions.userId))
    .where(and(...conditions))
    .orderBy(desc(diagnosticSubmissions.createdAt))
    .limit(200);

  const avg =
    rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + r.bhs, 0) / rows.length)
      : 0;
  const counts = {
    foundation: rows.filter((r) => r.stage === "foundation").length,
    growth: rows.filter((r) => r.stage === "growth").length,
    scale: rows.filter((r) => r.stage === "scale").length,
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        eyebrow="— Diagnostics"
        title="Business X-Ray submissions"
        description="Every diagnostic taken, scored across the 7 layers."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total submissions" value={rows.length.toString()} delay={0} />
        <StatCard label="Avg health score" value={avg.toString()} delay={0.06} />
        <StatCard label="Growth-stage" value={counts.growth.toString()} delay={0.12} />
        <StatCard label="Scale-stage" value={counts.scale.toString()} delay={0.18} />
      </div>

      <TableToolbar
        searchPlaceholder="Search by name or email…"
        filter={{ paramKey: "stage", options: STAGE_FILTERS }}
      />

      <Card className="border-none bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Person</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Recommended</TableHead>
              <TableHead className="text-right">Taken</TableHead>
              <TableHead className="pr-6 text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    icon={Activity}
                    title="No diagnostics yet"
                    description="Submissions appear here once people take the Business X-Ray."
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="pl-6">
                    <div className="text-sm font-medium">{r.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {r.bhs}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.stage === "scale"
                          ? "default"
                          : r.stage === "growth"
                            ? "secondary"
                            : "secondary"
                      }
                      className="font-normal capitalize"
                    >
                      {r.stage}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.recommended ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatDate(r.createdAt)}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <Link
                      href={`/diagnostic/results/${r.id}`}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      View report
                    </Link>
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
