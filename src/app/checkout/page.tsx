import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { users, students } from "@/db/schema";
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
      .select({ id: users.id, points: users.pointsBalance })
      .from(users)
      .where(eq(users.clerkId, me.userId))
      .limit(1);
    points = u?.points ?? 0;

    // Profile-required gate. A student completes the one-time /student/profile
    // form before checking out (we collect their phone there, but do NOT block
    // the purchase on a separate phone-OTP step). Super-admins / partner-admins
    // (impersonating or otherwise) bypass.
    if (u && me.role === "student") {
      const [st] = await db
        .select({ profileCompletedAt: students.profileCompletedAt })
        .from(students)
        .where(eq(students.userId, u.id))
        .limit(1);
      if (!st?.profileCompletedAt) {
        redirect("/student/profile?required=1&returnTo=/checkout");
      }
    }
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
