import { asc, desc, eq, sql } from "drizzle-orm";
import { Package, ExternalLink } from "lucide-react";
import Link from "next/link";
import { db } from "@/db/client";
import { bundles, bundleItems, programs } from "@/db/schema";
import { requireTenantId } from "@/lib/tenant";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { NewBundleDialog, BundleRowActions } from "./bundle-dialog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bundles — eurodigital.coach" };

export default async function AdminBundlesPage() {
  const tenantId = await requireTenantId();

  const [bundleRows, courses] = await Promise.all([
    db
      .select({
        id: bundles.id,
        name: bundles.name,
        slug: bundles.slug,
        priceCents: bundles.priceCents,
        currency: bundles.currency,
        isActive: bundles.isActive,
        courseCount: sql<number>`count(${bundleItems.id})::int`,
        listCents: sql<number>`coalesce(sum(${programs.priceCents}),0)::int`,
      })
      .from(bundles)
      .leftJoin(bundleItems, eq(bundleItems.bundleId, bundles.id))
      .leftJoin(programs, eq(programs.id, bundleItems.programId))
      .where(eq(bundles.tenantId, tenantId))
      .groupBy(bundles.id)
      .orderBy(desc(bundles.createdAt)),
    db
      .select({ id: programs.id, name: programs.name, priceCents: programs.priceCents, currency: programs.currency })
      .from(programs)
      .where(eq(programs.tenantId, tenantId))
      .orderBy(asc(programs.name)),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="— Bundles"
        title="Course bundles"
        description="Sell several of your courses together at one discounted price. Buyers enroll in every course in a single checkout."
        actions={<NewBundleDialog courses={courses} />}
      />

      {bundleRows.length === 0 ? (
        <Card className="border-none bg-card p-12 text-center shadow-card">
          <Package className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No bundles yet. Group 2+ courses to create your first bundle.
          </p>
        </Card>
      ) : (
        <Card className="border-none bg-card p-0 shadow-card">
          <ul className="divide-y">
            {bundleRows.map((b) => {
              const savings = Math.max(0, b.listCents - b.priceCents);
              return (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Package className="size-4 shrink-0 text-[#1AADE0]" />
                      <span className="truncate text-sm font-semibold">{b.name}</span>
                      <Badge variant={b.isActive ? "default" : "secondary"} className="font-normal">
                        {b.isActive ? "Live" : "Hidden"}
                      </Badge>
                    </div>
                    <div className="mt-1 pl-6 text-xs text-muted-foreground">
                      {b.courseCount} courses · {formatCurrency(b.priceCents, b.currency)}
                      {savings > 0 && (
                        <span className="ml-1 text-[#6fa62a]">
                          · saves {formatCurrency(savings, b.currency)}
                        </span>
                      )}
                      {b.slug && (
                        <Link
                          href={`/bundles/${b.slug}`}
                          target="_blank"
                          className="ml-2 inline-flex items-center gap-1 text-[#1AADE0] hover:underline"
                        >
                          <ExternalLink className="size-3" /> View
                        </Link>
                      )}
                    </div>
                  </div>
                  <BundleRowActions id={b.id} active={b.isActive} />
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
