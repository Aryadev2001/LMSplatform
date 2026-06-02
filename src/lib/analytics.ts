import { sql } from "drizzle-orm";
import { db } from "@/db/client";

/**
 * Partner analytics — all tenant-scoped, computed from existing data
 * (payments, enrollments, programs, course_reviews). One parallel batch.
 */
export interface PartnerAnalytics {
  currency: string;
  kpis: {
    revenueCents: number;
    enrollments: number;
    students: number;
    publishedCourses: number;
    pendingCourses: number;
    avgRating: number;
    reviews: number;
  };
  daily: { date: string; revenueCents: number; enrollments: number }[];
  topCourses: { id: string; name: string; enrollments: number; revenueCents: number }[];
}

const DAYS = 90;
const PAID = "('paid','account_created','assigned')";

type Row = Record<string, unknown>;
const rows = (r: { rows?: Row[] } | Row[]): Row[] =>
  (Array.isArray(r) ? r : r.rows) ?? [];
const n = (v: unknown): number => Number(v ?? 0) || 0;

export async function getPartnerAnalytics(tenantId: string): Promise<PartnerAnalytics> {
  const [kpiR, curR, revR, enrR, topR] = await Promise.all([
    db.execute(sql`
      SELECT
        (SELECT COALESCE(SUM(amount_cents),0)::int FROM payments
           WHERE tenant_id = ${tenantId} AND status = 'succeeded') AS revenue,
        (SELECT COUNT(*)::int FROM enrollments e JOIN programs p ON p.id = e.program_id
           WHERE p.tenant_id = ${tenantId} AND e.status IN ${sql.raw(PAID)}) AS enrollments,
        (SELECT COUNT(DISTINCT e.user_id)::int FROM enrollments e JOIN programs p ON p.id = e.program_id
           WHERE p.tenant_id = ${tenantId} AND e.status IN ${sql.raw(PAID)} AND e.user_id IS NOT NULL) AS students,
        (SELECT COUNT(*)::int FROM programs
           WHERE tenant_id = ${tenantId} AND status = 'published' AND is_active = true AND approved_at IS NOT NULL) AS published,
        (SELECT COUNT(*)::int FROM programs
           WHERE tenant_id = ${tenantId} AND status = 'published' AND is_active = true AND approved_at IS NULL) AS pending,
        (SELECT COALESCE(AVG(rating),0)::float8 FROM course_reviews WHERE tenant_id = ${tenantId}) AS avg_rating,
        (SELECT COUNT(*)::int FROM course_reviews WHERE tenant_id = ${tenantId}) AS reviews
    `),
    db.execute(sql`
      SELECT currency FROM payments WHERE tenant_id = ${tenantId} AND status = 'succeeded'
      GROUP BY currency ORDER BY COUNT(*) DESC LIMIT 1
    `),
    db.execute(sql`
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS d,
             COALESCE(SUM(amount_cents),0)::int AS v
      FROM payments
      WHERE tenant_id = ${tenantId} AND status = 'succeeded'
        AND created_at >= now() - interval '${sql.raw(String(DAYS))} days'
      GROUP BY 1
    `),
    db.execute(sql`
      SELECT to_char(date_trunc('day', e.created_at), 'YYYY-MM-DD') AS d,
             COUNT(*)::int AS v
      FROM enrollments e JOIN programs p ON p.id = e.program_id
      WHERE p.tenant_id = ${tenantId} AND e.status IN ${sql.raw(PAID)}
        AND e.created_at >= now() - interval '${sql.raw(String(DAYS))} days'
      GROUP BY 1
    `),
    db.execute(sql`
      SELECT p.id, p.name,
        (SELECT COUNT(*)::int FROM enrollments e
           WHERE e.program_id = p.id AND e.status IN ${sql.raw(PAID)}) AS enrollments,
        (SELECT COALESCE(SUM(pay.amount_cents),0)::int FROM payments pay
           JOIN enrollments e2 ON e2.id = pay.enrollment_id
           WHERE e2.program_id = p.id AND pay.status = 'succeeded') AS revenue
      FROM programs p
      WHERE p.tenant_id = ${tenantId}
      ORDER BY revenue DESC, enrollments DESC
      LIMIT 6
    `),
  ]);

  const k = rows(kpiR)[0] ?? {};
  const currency = (rows(curR)[0]?.currency as string) ?? "INR";

  // Build a continuous last-DAYS series, filling gaps with zero.
  const revMap = new Map(rows(revR).map((r) => [String(r.d), n(r.v)]));
  const enrMap = new Map(rows(enrR).map((r) => [String(r.d), n(r.v)]));
  const daily: PartnerAnalytics["daily"] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    daily.push({ date: key, revenueCents: revMap.get(key) ?? 0, enrollments: enrMap.get(key) ?? 0 });
  }

  return {
    currency,
    kpis: {
      revenueCents: n(k.revenue),
      enrollments: n(k.enrollments),
      students: n(k.students),
      publishedCourses: n(k.published),
      pendingCourses: n(k.pending),
      avgRating: n(k.avg_rating),
      reviews: n(k.reviews),
    },
    daily,
    topCourses: rows(topR).map((r) => ({
      id: String(r.id),
      name: String(r.name),
      enrollments: n(r.enrollments),
      revenueCents: n(r.revenue),
    })),
  };
}
