import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { requireFeature } from "@/lib/tier-lock";
import { PageHeader } from "@/components/dashboard/page-header";
import { PartnerAiCatalog } from "./partner-ai-catalog";

export const dynamic = "force-dynamic";

export default async function PartnerAiServicesPage() {
  const me = await requireRole("admin");
  await requireFeature("ai_services");
  const [u] = await db
    .select({ points: users.pointsBalance })
    .from(users)
    .where(eq(users.clerkId, me.userId))
    .limit(1);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="— AI Services"
        title="Enhance & resell with AI"
        description="Buy AI tools for your operations (2× reward points) or resell them to your students with your own branding."
      />
      <PartnerAiCatalog pointsBalance={u?.points ?? 0} />
    </div>
  );
}
