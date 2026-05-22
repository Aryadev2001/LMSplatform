import Link from "next/link";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import {
  courseReviews,
  users,
  programs,
  tenants,
} from "@/db/schema";
import { requireSuper } from "@/lib/auth";
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
import { Star } from "lucide-react";
import { HideReviewButton, UnhideReviewButton } from "./moderation-buttons";

export const dynamic = "force-dynamic";

export const metadata = { title: "Reviews — eurodigital.coach" };

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "visible", label: "Visible" },
  { value: "hidden", label: "Hidden" },
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];

export default async function SuperReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireSuper();
  const { q, status } = await searchParams;
  const search = q?.trim();
  const activeFilter: StatusFilter = (STATUS_FILTERS.map((s) => s.value) as readonly string[])
    .includes(status ?? "")
    ? (status as StatusFilter)
    : "all";

  const conditions: (SQL | undefined)[] = [];
  if (activeFilter === "visible") {
    conditions.push(sql`${courseReviews.hiddenAt} is null`);
  } else if (activeFilter === "hidden") {
    conditions.push(sql`${courseReviews.hiddenAt} is not null`);
  }
  if (search) {
    conditions.push(
      or(
        ilike(users.fullName, `%${search}%`),
        ilike(users.email, `%${search}%`),
        ilike(programs.name, `%${search}%`),
        ilike(courseReviews.body, `%${search}%`),
      ),
    );
  }
  const where = conditions.length
    ? and(...conditions.filter((c): c is SQL => Boolean(c)))
    : undefined;

  const rows = await db
    .select({
      id: courseReviews.id,
      rating: courseReviews.rating,
      body: courseReviews.body,
      createdAt: courseReviews.createdAt,
      hiddenAt: courseReviews.hiddenAt,
      hiddenReason: courseReviews.hiddenReason,
      tenantSlug: tenants.slug,
      tenantName: tenants.name,
      courseName: programs.name,
      courseSlug: programs.slug,
      authorName: users.fullName,
      authorEmail: users.email,
    })
    .from(courseReviews)
    .innerJoin(users, eq(users.id, courseReviews.userId))
    .innerJoin(programs, eq(programs.id, courseReviews.courseId))
    .innerJoin(tenants, eq(tenants.id, courseReviews.tenantId))
    .where(where)
    .orderBy(desc(courseReviews.createdAt))
    .limit(500);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="— Reviews"
        title="Review moderation"
        description="Every course review across every tenant. Hide spam / abuse / off-topic — hidden reviews disappear from public aggregates, course pages, and storefronts."
      />

      <div className="mb-4">
        <TableToolbar
          searchPlaceholder="Search by author, course, or review text…"
          filter={{
            paramKey: "status",
            options: STATUS_FILTERS.map((s) => ({ value: s.value, label: s.label })),
          }}
        />
      </div>

      <Card className="border-none bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Author / course</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Body</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">When</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  {search ? `No reviews match "${search}"` : "No reviews yet."}
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="text-sm font-bold">
                    {r.authorName ?? "(no name)"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {r.authorEmail}
                  </div>
                  <Link
                    href={
                      r.courseSlug ? `/courses/${r.courseSlug}` : "#"
                    }
                    className="mt-1 inline-block text-[11px] font-semibold underline-offset-2 hover:underline"
                    style={{ color: "var(--ed-blue)" }}
                  >
                    {r.courseName}
                  </Link>
                </TableCell>
                <TableCell className="text-xs">{r.tenantName}</TableCell>
                <TableCell>
                  <div className="inline-flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`size-3 ${r.rating >= n ? "fill-current" : ""}`}
                        style={{
                          color: r.rating >= n ? "#F59E0B" : "var(--ed-line, #E2E8F0)",
                        }}
                        strokeWidth={1.5}
                      />
                    ))}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {r.rating}/5
                  </div>
                </TableCell>
                <TableCell className="max-w-md">
                  <p className="line-clamp-3 text-xs">
                    {r.body ?? <span className="italic text-muted-foreground">(no text)</span>}
                  </p>
                  {r.hiddenAt && r.hiddenReason && (
                    <p className="mt-1 text-[10px] italic text-destructive">
                      Hidden: {r.hiddenReason}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  {r.hiddenAt ? (
                    <Badge variant="destructive" className="font-normal">
                      Hidden
                    </Badge>
                  ) : (
                    <Badge variant="default" className="font-normal">
                      Visible
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {formatDate(r.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  {r.hiddenAt ? (
                    <UnhideReviewButton reviewId={r.id} />
                  ) : (
                    <HideReviewButton reviewId={r.id} />
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
