import Link from "next/link";
import { db } from "@/db/client";
import { users, students, programs } from "@/db/schema";
import { eq, and, or, ilike, inArray } from "drizzle-orm";
import { STUDENT_DB_ROLES } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AssignDialog } from "./assign-dialog";
import { formatDate, initialsOf } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const tenantId = await requireTenantId();
  const search = q?.trim();
  const studentWhere = search
    ? and(
        eq(users.tenantId, tenantId),
        inArray(users.role, [...STUDENT_DB_ROLES]),
        or(ilike(users.fullName, `%${search}%`), ilike(users.email, `%${search}%`)),
      )
    : and(
        eq(users.tenantId, tenantId),
        inArray(users.role, [...STUDENT_DB_ROLES]),
      );

  const [studentRows, programOptions] = await Promise.all([
    db
      .select({
        userId: users.id,
        email: users.email,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        assignedProgramId: students.assignedProgramId,
        programName: programs.name,
      })
      .from(users)
      .leftJoin(students, eq(users.id, students.userId))
      .leftJoin(programs, eq(students.assignedProgramId, programs.id))
      .where(studentWhere)
      .orderBy(users.createdAt),
    db
      .select({ id: programs.id, name: programs.name, isActive: programs.isActive })
      .from(programs)
      .where(eq(programs.tenantId, tenantId)),
  ]);

  const activePrograms = programOptions.filter((p) => p.isActive);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="— Students"
        title="Manage students"
        description="Every paying student. Assign a coach and program from this view."
      />

      <div className="mb-4">
        <TableToolbar searchPlaceholder="Search students by name or email…" />
      </div>

      <Card className="border-none bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead className="text-right">Joined</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {studentRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                  No students yet. They appear here after enrollment + sign-up.
                </TableCell>
              </TableRow>
            ) : (
              studentRows.map((r) => {
                return (
                  <TableRow key={r.userId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          {r.avatarUrl && <AvatarImage src={r.avatarUrl} />}
                          <AvatarFallback className="bg-secondary text-xs">
                            {initialsOf(r.fullName ?? r.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{r.fullName ?? "—"}</div>
                          <div className="truncate text-xs text-muted-foreground">{r.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.programName ? (
                        <Badge variant="default" className="font-normal">
                          {r.programName}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="font-normal">
                          Unassigned
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatDate(r.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/students/${r.userId}`}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          View
                        </Link>
                        <AssignDialog
                          student={{ userId: r.userId, name: r.fullName ?? r.email }}
                          programsList={activePrograms.map((p) => ({ id: p.id, name: p.name }))}
                          currentProgramId={r.assignedProgramId}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
