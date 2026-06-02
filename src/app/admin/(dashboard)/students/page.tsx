import Link from "next/link";
import { db } from "@/db/client";
import { users, students, programs, enrollments } from "@/db/schema";
import { eq, and, or, ilike, inArray, sql } from "drizzle-orm";
import { Lock } from "lucide-react";
import { STUDENT_DB_ROLES } from "@/lib/auth";
import { requireTenantId } from "@/lib/tenant";
import { hasFeature } from "@/lib/tier-lock";
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
  // Standard+ unlocks contact details, the per-student detail page, and
  // course assignment. Basic sees the roster (name + course + date) only.
  const canSeeDetails = await hasFeature("student_details");
  const search = q?.trim();
  // Restricted to PAYING students per the partner-dashboard lockdown: only
  // users with at least one paid/account_created/assigned enrollment in
  // this tenant. A user who only enrolled in free courses, or who's a
  // signed-up learner without payment, won't appear here.
  const paidUserIdsSubquery = db
    .selectDistinct({ id: enrollments.userId })
    .from(enrollments)
    .innerJoin(programs, eq(programs.id, enrollments.programId))
    .where(
      and(
        eq(programs.tenantId, tenantId),
        inArray(enrollments.status, ["paid", "account_created", "assigned"]),
        sql`${enrollments.userId} IS NOT NULL`,
      ),
    );

  const studentWhere = search
    ? and(
        eq(users.tenantId, tenantId),
        inArray(users.role, [...STUDENT_DB_ROLES]),
        inArray(users.id, paidUserIdsSubquery),
        or(ilike(users.fullName, `%${search}%`), ilike(users.email, `%${search}%`)),
      )
    : and(
        eq(users.tenantId, tenantId),
        inArray(users.role, [...STUDENT_DB_ROLES]),
        inArray(users.id, paidUserIdsSubquery),
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
        title="Enrolled students"
        description={
          canSeeDetails
            ? "Students enrolled in your courses, with contact details and per-student insights."
            : "Students enrolled in your courses. Upgrade to Standard to see contact details, open a student's profile, and assign courses."
        }
      />

      {!canSeeDetails && (
        <Link
          href="/admin/partner/billing"
          className="mb-4 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm transition-colors hover:bg-primary/10"
        >
          <Lock className="size-4 shrink-0 text-primary" />
          <span className="text-foreground">
            <span className="font-semibold">You can see who enrolled.</span>{" "}
            <span className="text-muted-foreground">
              Upgrade to Standard to view contact details, profiles &amp; progress, and assign courses.
            </span>
          </span>
          <span className="ml-auto shrink-0 font-semibold text-primary">Upgrade →</span>
        </Link>
      )}

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
                          {canSeeDetails ? (
                            <div className="truncate text-xs text-muted-foreground">{r.email}</div>
                          ) : (
                            <div className="truncate text-xs italic text-muted-foreground/70">
                              Contact hidden
                            </div>
                          )}
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
                      {canSeeDetails ? (
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
                      ) : (
                        <Link
                          href="/admin/partner/billing"
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-secondary"
                          title="Upgrade to Standard to view student details and assign courses"
                        >
                          <Lock className="size-3" />
                          Upgrade
                        </Link>
                      )}
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
