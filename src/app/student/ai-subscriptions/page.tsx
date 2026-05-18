import Link from "next/link";
import { Sparkles } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function StudentAiSubscriptionsPage() {
  await requireRole("student");

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="— AI Services"
        title="My AI subscriptions"
        description="Active europic.ai services, renewal dates, pause & cancel."
      />
      <Card className="border-none bg-card shadow-card">
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <Sparkles className="size-10 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold">No active AI subscriptions yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Subscriptions appear here once you purchase an AI service.
              (Provisioning + metering go live with the europic.ai integration.)
            </p>
          </div>
          <Link
            href="/student/ai-services"
            className={buttonVariants({ size: "sm", className: "rounded-xl" })}
          >
            Browse AI Services
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
