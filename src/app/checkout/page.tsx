import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { EuroNav } from "@/components/euro/euro-nav";
import { EuroFooter } from "@/components/euro/euro-footer";
import { CheckoutFlow } from "./checkout-flow";

export const dynamic = "force-dynamic";

export const metadata = { title: "Checkout — eurodigital.coach" };

export default async function CheckoutPage() {
  const me = await getCurrentUser();
  let points = 0;
  if (me) {
    const [u] = await db
      .select({ points: users.pointsBalance })
      .from(users)
      .where(eq(users.clerkId, me.userId))
      .limit(1);
    points = u?.points ?? 0;
  }

  return (
    <div style={{ background: "var(--ed-bg)" }} className="min-h-screen">
      <EuroNav />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1
          className="mb-8 text-3xl font-extrabold tracking-tight"
          style={{ color: "var(--ed-ink)" }}
        >
          Checkout
        </h1>
        <CheckoutFlow pointsBalance={points} />
      </main>
      <EuroFooter />
    </div>
  );
}
