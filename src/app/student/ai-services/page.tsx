import { eq, and, inArray, isNotNull, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { users, programs, enrollments } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { AiCatalog, type CatalogCourse } from "./ai-catalog";

export const dynamic = "force-dynamic";

export default async function StudentAiServicesPage() {
  const me = await requireRole("student");
  const [u] = await db
    .select({ id: users.id, points: users.pointsBalance })
    .from(users)
    .where(eq(users.clerkId, me.userId))
    .limit(1);

  // Platform "AI Catalog" courses — shown to EVERY student, purchasable.
  const courses: CatalogCourse[] = await db
    .select({
      id: programs.id,
      name: programs.name,
      slug: programs.slug,
      tagline: programs.tagline,
      imageUrl: programs.imageUrl,
      priceCents: programs.priceCents,
      currency: programs.currency,
    })
    .from(programs)
    .where(
      and(
        eq(programs.studentCatalog, true),
        eq(programs.status, "published"),
        isNotNull(programs.approvedAt),
        eq(programs.isActive, true),
      ),
    )
    .orderBy(desc(programs.createdAt));

  // Which of those the student already owns (so we show Continue, not Buy).
  const enrolled = u
    ? await db
        .select({ pid: enrollments.programId })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.userId, u.id),
            inArray(enrollments.status, ["paid", "account_created", "assigned"]),
          ),
        )
    : [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="— AI Catalog"
        title="AI Courses & Services"
        description="Premium AI courses from EuroDigital, plus AI add-on tools. Earn reward points on every purchase."
      />
      <AiCatalog
        pointsBalance={u?.points ?? 0}
        courses={courses}
        enrolledProgramIds={enrolled
          .map((e) => e.pid)
          .filter((x): x is string => x !== null)}
      />
    </div>
  );
}
