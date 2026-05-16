import Link from "next/link";
import { db } from "@/db/client";
import { users, diagnosticSubmissions } from "@/db/schema";
import { eq, desc, or } from "drizzle-orm";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/empty-state";
import { requireRole } from "@/lib/auth";
import { Activity, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StudentDiagnosticPage() {
  const auth = await requireRole("student");
  const [me] = await db.select().from(users).where(eq(users.clerkId, auth.userId)).limit(1);
  if (!me) return null;

  // Match by linked userId OR by email (anonymous submission before signup)
  const subs = await db
    .select()
    .from(diagnosticSubmissions)
    .where(
      or(eq(diagnosticSubmissions.userId, me.id), eq(diagnosticSubmissions.email, me.email)),
    )
    .orderBy(desc(diagnosticSubmissions.createdAt))
    .limit(10);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        eyebrow="— Business X-Ray"
        title="My diagnostic"
        description="Your 7-layer business scan results."
      />

      {subs.length === 0 ? (
        <Card className="border-none bg-card shadow-card">
          <CardContent className="py-4">
            <EmptyState
              icon={Activity}
              title="You haven't taken the Business X-Ray yet"
              description="Run the 7-layer scan to get your Business Health Score and a personalised course recommendation."
              action={
                <Link
                  href="/diagnostic"
                  className={buttonVariants({ size: "sm", className: "rounded-xl" })}
                >
                  Take the diagnostic
                </Link>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {subs.map((s) => (
            <Link
              key={s.id}
              href={`/diagnostic/results/${s.id}`}
              className="flex items-center justify-between rounded-2xl bg-card p-5 shadow-card transition-shadow hover:shadow-soft"
            >
              <div className="flex items-center gap-4">
                <div
                  className="flex size-12 items-center justify-center rounded-xl text-lg font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #8CC63F 0%, #1AADE0 100%)" }}
                >
                  {s.businessHealthScore}
                </div>
                <div>
                  <div className="text-sm font-semibold capitalize">{s.stage} stage</div>
                  <div className="text-xs text-muted-foreground">
                    Taken {formatDate(s.createdAt)}
                  </div>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
          <div className="pt-2 text-center">
            <Link
              href="/diagnostic"
              className={buttonVariants({ variant: "outline", className: "rounded-xl" })}
            >
              Retake the diagnostic
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
