import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import {
  users,
  students,
  programs,
  enrollments,
  payments,
  sessions,
  assignments,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/dashboard/empty-state";
import { formatCurrency, formatDate, initialsOf } from "@/lib/format";
import { isStudentRole } from "@/lib/auth";
import { AssignDialog } from "../assign-dialog";
import { PaymentDetail } from "../../payments/payment-detail";
import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  CreditCard,
  Mail,
  Phone,
  Target,
} from "lucide-react";

export const dynamic = "force-dynamic";

const ENROLL_STATUS_LABELS: Record<string, string> = {
  pending: "Pending payment",
  paid: "Paid",
  account_created: "Account created",
  assigned: "Assigned",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const [me] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!me || !isStudentRole(me.role)) notFound();

  const [studentRows, sessionRows, assignmentRows, paymentRows, enrollmentRows, programOptions] =
    await Promise.all([
      db.select().from(students).where(eq(students.userId, userId)).limit(1),
      db
        .select()
        .from(sessions)
        .where(eq(sessions.studentId, userId))
        .orderBy(desc(sessions.scheduledAt))
        .limit(8),
      db
        .select()
        .from(assignments)
        .where(eq(assignments.studentId, userId))
        .orderBy(desc(assignments.createdAt))
        .limit(8),
      db
        .select()
        .from(payments)
        .where(eq(payments.studentUserId, userId))
        .orderBy(desc(payments.createdAt)),
      db
        .select()
        .from(enrollments)
        .where(eq(enrollments.userId, userId))
        .orderBy(desc(enrollments.createdAt)),
      db
        .select({ id: programs.id, name: programs.name, isActive: programs.isActive })
        .from(programs),
    ]);

  const student = studentRows[0];

  const program = student?.assignedProgramId
    ? await db.select().from(programs).where(eq(programs.id, student.assignedProgramId)).limit(1)
    : [];

  const programInfo = program[0] ?? null;
  const activePrograms = programOptions.filter((p) => p.isActive);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link
        href="/admin/students"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to students
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-card md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            {me.avatarUrl && <AvatarImage src={me.avatarUrl} />}
            <AvatarFallback className="bg-foreground/5 text-base">
              {initialsOf(me.fullName ?? me.email)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{me.fullName ?? "—"}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5" />
                {me.email}
              </span>
              {student?.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3.5" />
                  {student.phone}
                </span>
              )}
              <span>Joined {formatDate(me.createdAt)}</span>
            </div>
          </div>
        </div>
        <AssignDialog
          student={{ userId, name: me.fullName ?? me.email }}
          programsList={activePrograms.map((p) => ({ id: p.id, name: p.name }))}
          currentProgramId={student?.assignedProgramId ?? null}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Program & coach */}
          <Card className="border-none bg-card shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Enrolled course</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl bg-secondary/40 p-4">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Course
                </div>
                <div className="mt-1 text-sm font-medium">
                  {programInfo?.name ?? "Not assigned"}
                </div>
                {programInfo && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatCurrency(programInfo.priceCents, programInfo.currency)} ·{" "}
                    {programInfo.durationMonths} mo
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sessions */}
          <Card className="border-none bg-card shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Sessions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sessionRows.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No sessions yet"
                  description="Sessions scheduled by the coach appear here."
                />
              ) : (
                sessionRows.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl bg-secondary/40 p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{s.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(s.scheduledAt)} · {s.durationMinutes} min
                      </div>
                    </div>
                    <Badge variant="secondary" className="font-normal capitalize">
                      {s.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Assignments */}
          <Card className="border-none bg-card shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Assignments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {assignmentRows.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No assignments yet"
                  description="Work assigned by the coach appears here."
                />
              ) : (
                assignmentRows.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-xl bg-secondary/40 p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{a.title}</div>
                      {a.dueAt && (
                        <div className="text-xs text-muted-foreground">
                          Due {formatDate(a.dueAt)}
                        </div>
                      )}
                    </div>
                    <Badge variant="secondary" className="font-normal capitalize">
                      {a.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Goals */}
          <Card className="border-none bg-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="size-4" />
                Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {student?.goals || "No goals recorded for this student."}
              </p>
            </CardContent>
          </Card>

          {/* Enrollment history */}
          <Card className="border-none bg-card shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Enrollment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {enrollmentRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No enrollment record.</p>
              ) : (
                enrollmentRows.map((e) => (
                  <div key={e.id} className="rounded-xl bg-secondary/40 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{e.fullName}</span>
                      <Badge
                        variant={
                          e.status === "cancelled" || e.status === "refunded"
                            ? "destructive"
                            : e.status === "pending"
                              ? "secondary"
                              : "default"
                        }
                        className="font-normal"
                      >
                        {ENROLL_STATUS_LABELS[e.status] ?? e.status}
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Submitted {formatDate(e.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Payments */}
          <Card className="border-none bg-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="size-4" />
                Payments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {paymentRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded.</p>
              ) : (
                paymentRows.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl bg-secondary/40 p-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium tabular-nums">
                        {formatCurrency(p.amountCents, p.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(p.createdAt)}
                      </div>
                    </div>
                    <PaymentDetail
                      payment={{
                        id: p.id,
                        studentName: me.fullName ?? me.email,
                        studentEmail: me.email,
                        amountCents: p.amountCents,
                        refundedCents: p.refundedCents,
                        currency: p.currency,
                        status: p.status,
                        description: p.description,
                        paymentMethodLabel: p.paymentMethodLabel,
                        stripePaymentIntentId: p.stripePaymentIntentId,
                        stripeChargeId: p.stripeChargeId,
                        stripeCustomerId: p.stripeCustomerId,
                        receiptUrl: p.receiptUrl,
                        createdAt: p.createdAt.toISOString(),
                      }}
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
