import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { db } from "@/db/client";
import {
  users,
  students,
  tenants,
  enrollments,
  payments,
  programs,
} from "@/db/schema";
import { requireSuper, type SuperRole } from "@/lib/auth";
import { canSeeFinancials } from "@/lib/super";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

interface JsonShape {
  [k: string]: unknown;
}
function asObject(v: unknown): JsonShape {
  if (v && typeof v === "object") return v as JsonShape;
  return {};
}

export default async function SuperStudentDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const me = await requireSuper();
  const showMoney = canSeeFinancials(me.rawRole as SuperRole);
  const { userId } = await params;

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
      tenantId: users.tenantId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) notFound();

  const [tenant] = user.tenantId
    ? await db
        .select({
          id: tenants.id,
          name: tenants.name,
          slug: tenants.slug,
        })
        .from(tenants)
        .where(eq(tenants.id, user.tenantId))
        .limit(1)
    : [];

  const [st] = await db
    .select()
    .from(students)
    .where(eq(students.userId, user.id))
    .limit(1);

  const enrolRows = await db
    .select({
      id: enrollments.id,
      status: enrollments.status,
      createdAt: enrollments.createdAt,
      programId: enrollments.programId,
      programName: programs.name,
      programSlug: programs.slug,
      programPriceCents: programs.priceCents,
    })
    .from(enrollments)
    .leftJoin(programs, eq(programs.id, enrollments.programId))
    .where(eq(enrollments.userId, user.id))
    .orderBy(desc(enrollments.createdAt));

  const paymentRows = await db
    .select({
      id: payments.id,
      amountCents: payments.amountCents,
      refundedCents: payments.refundedCents,
      currency: payments.currency,
      status: payments.status,
      description: payments.description,
      paymentMethodLabel: payments.paymentMethodLabel,
      receiptUrl: payments.receiptUrl,
      createdAt: payments.createdAt,
      tenantId: payments.tenantId,
      tenantName: tenants.name,
      programId: enrollments.programId,
      programName: programs.name,
    })
    .from(payments)
    .leftJoin(tenants, eq(tenants.id, payments.tenantId))
    .leftJoin(enrollments, eq(enrollments.id, payments.enrollmentId))
    .leftJoin(programs, eq(programs.id, enrollments.programId))
    .where(eq(payments.studentUserId, user.id))
    .orderBy(desc(payments.createdAt));

  const personal = asObject(st?.personalInfo);
  const professional = asObject(st?.professionalInfo);
  const financial = asObject(st?.financialInfo);

  const totalSpend = paymentRows
    .filter((p) => p.status === "succeeded")
    .reduce((s, p) => s + p.amountCents, 0);

  return (
    <div>
      <Link
        href="/super-admin/students"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        All students
      </Link>

      <PageHeader
        eyebrow={tenant ? `/${tenant.slug}` : "no tenant"}
        title={user.fullName ?? user.email}
        description={`${user.email} · joined ${formatDate(user.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            {st?.profileCompletedAt ? (
              <Badge variant="default" className="font-normal">
                <CheckCircle2 className="size-3" /> Profile complete
              </Badge>
            ) : (
              <Badge variant="secondary" className="font-normal">
                <XCircle className="size-3" /> Profile incomplete
              </Badge>
            )}
            {tenant && (
              <Link
                href={`/super-admin/tenants/${tenant.id}`}
                className="rounded-xl border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
              >
                Open tenant
              </Link>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Personal &amp; contact</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Row
              label="Mobile"
              value={
                st?.phone
                  ? `${st.phone}${st.phoneVerifiedAt ? "  ✓ verified" : "  · unverified"}`
                  : null
              }
            />
            <Row label="Date of birth" value={st?.dateOfBirth ?? null} />
            <Row
              label="Address"
              value={st?.address ?? null}
              wide
            />
            <Row label="Country" value={(personal.country as string) ?? null} />
            <Row label="City" value={(personal.city as string) ?? null} />
            <Row label="Gender" value={(personal.gender as string) ?? null} />
            <Row
              label="Languages"
              value={(personal.languages as string) ?? null}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Compliance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row
              label="Terms accepted"
              value={
                st?.termsAcceptedAt
                  ? formatDate(st.termsAcceptedAt)
                  : null
              }
            />
            <Row
              label="Disclaimer"
              value={
                st?.disclaimerAcceptedAt
                  ? formatDate(st.disclaimerAcceptedAt)
                  : null
              }
            />
            <Row
              label="WhatsApp consent"
              value={st?.whatsappConsent ? "Opted in" : null}
            />
            <Row
              label="Payment preference"
              value={st?.paymentModePreference ?? null}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Professional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row
              label="Occupation"
              value={(professional.occupation as string) ?? null}
            />
            <Row
              label="Company"
              value={(professional.company as string) ?? null}
            />
            <Row
              label="Industry"
              value={(professional.industry as string) ?? null}
            />
            <Row
              label="Experience"
              value={
                typeof professional.experienceYears === "number"
                  ? `${professional.experienceYears} yrs`
                  : null
              }
            />
            <Row
              label="LinkedIn"
              value={(professional.linkedin as string) ?? null}
              link={(professional.linkedin as string) ?? null}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Financial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row
              label="Income range"
              value={(financial.incomeRange as string) ?? null}
            />
            <Row
              label="Funding source"
              value={(financial.fundingSource as string) ?? null}
            />
            <Row
              label="Billing address"
              value={(financial.billingAddress as string) ?? null}
              wide
            />
            <Row
              label="Tax ID"
              value={(financial.taxId as string) ?? null}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              Enrollments ({enrolRows.length})
            </CardTitle>
            {showMoney && totalSpend > 0 && (
              <Badge variant="secondary" className="font-normal">
                Lifetime spend: {formatCurrency(totalSpend, "INR")}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrolRows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No enrollments yet.
                  </TableCell>
                </TableRow>
              )}
              {enrolRows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm">
                    {e.programSlug ? (
                      <Link
                        href={`/courses/${e.programSlug}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {e.programName ?? "—"}
                      </Link>
                    ) : (
                      e.programName ?? "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {e.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {showMoney
                      ? formatCurrency(e.programPriceCents ?? 0, "INR")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatDate(e.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">
            Payments ({paymentRows.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentRows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No payments yet.
                  </TableCell>
                </TableRow>
              )}
              {paymentRows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(p.createdAt)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {p.programName ?? p.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.paymentMethodLabel ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {showMoney
                      ? formatCurrency(p.amountCents, p.currency)
                      : "—"}
                    {p.refundedCents > 0 && showMoney && (
                      <div className="text-[10px] text-muted-foreground">
                        refunded {formatCurrency(p.refundedCents, p.currency)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {p.receiptUrl ? (
                      <a
                        href={p.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium underline-offset-2 hover:underline"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  link,
  wide,
}: {
  label: string;
  value: string | null;
  link?: string | null;
  wide?: boolean;
}) {
  const has = !!value;
  return (
    <div
      className={`grid grid-cols-[120px_1fr] gap-2 border-b py-1.5 last:border-b-0 ${wide ? "sm:col-span-2" : ""}`}
    >
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`break-words text-xs ${has ? "text-foreground" : "text-muted-foreground"}`}
      >
        {has && link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline-offset-2 hover:underline"
          >
            {value}
          </a>
        ) : (
          value || "—"
        )}
      </dd>
    </div>
  );
}
