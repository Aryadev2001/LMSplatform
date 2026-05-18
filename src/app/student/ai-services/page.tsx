import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { AiCatalog } from "./ai-catalog";

export const dynamic = "force-dynamic";

export default async function StudentAiServicesPage() {
  const me = await requireRole("student");
  const [u] = await db
    .select({ points: users.pointsBalance })
    .from(users)
    .where(eq(users.clerkId, me.userId))
    .limit(1);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="— AI Services"
        title="Boost your learning with AI"
        description="AI add-on services powered by europic.ai. Earn reward points on every purchase."
      />
      <AiCatalog pointsBalance={u?.points ?? 0} />
    </div>
  );
}
