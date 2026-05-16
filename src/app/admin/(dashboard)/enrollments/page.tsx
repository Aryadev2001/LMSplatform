import { db } from "@/db/client";
import { enrollments, programs } from "@/db/schema";
import { desc, eq, and, or, ilike, type SQL } from "drizzle-orm";
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
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  paid: "default",
  account_created: "default",
  assigned: "default",
  cancelled: "destructive",
  refunded: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  account_created: "Account created",
  assigned: "Assigned",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "account_created", label: "Account" },
  { value: "assigned", label: "Assigned" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

type EnrollmentStatus =
  | "pending"
  | "paid"
  | "account_created"
  | "assigned"
  | "cancelled"
  | "refunded";

export default async function AdminEnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const search = q?.trim();
  const validStatus = STATUS_FILTER_OPTIONS.slice(1).map((o) => o.value);

  const conditions: SQL[] = [];
  if (search) {
    const s = or(
      ilike(enrollments.fullName, `%${search}%`),
      ilike(enrollments.email, `%${search}%`),
    );
    if (s) conditions.push(s);
  }
  if (status && validStatus.includes(status)) {
    conditions.push(eq(enrollments.status, status as EnrollmentStatus));
  }

  const rows = await db
    .select({
      id: enrollments.id,
      fullName: enrollments.fullName,
      email: enrollments.email,
      phone: enrollments.phone,
      status: enrollments.status,
      createdAt: enrollments.createdAt,
      programName: programs.name,
    })
    .from(enrollments)
    .leftJoin(programs, eq(enrollments.programId, programs.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(enrollments.createdAt));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="— Enrollments"
        title="Enrollment requests"
        description="Everyone who has filled the enrollment form, with their payment status."
      />

      <div className="mb-4">
        <TableToolbar
          searchPlaceholder="Search by name or email…"
          filter={{ paramKey: "status", options: STATUS_FILTER_OPTIONS }}
        />
      </div>

      <Card className="border-none bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Applicant</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                  No enrollments yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="text-sm font-medium">{r.fullName}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </TableCell>
                  <TableCell className="text-sm">{r.programName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[r.status] ?? "secondary"} className="font-normal">
                      {STATUS_LABELS[r.status] ?? r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatDate(r.createdAt)}
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
