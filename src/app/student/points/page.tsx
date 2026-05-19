import { desc, eq } from "drizzle-orm";
import { Coins } from "lucide-react";
import { db } from "@/db/client";
import { pointsTransactions } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getStudentSnapshot } from "@/lib/student";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StudentPointsPage() {
  const auth = await requireRole("student");
  const snap = await getStudentSnapshot(auth.userId);
  if (!snap) return null;

  const txns = await db
    .select({
      id: pointsTransactions.id,
      type: pointsTransactions.type,
      delta: pointsTransactions.pointsDelta,
      note: pointsTransactions.note,
      createdAt: pointsTransactions.createdAt,
      expiresAt: pointsTransactions.expiresAt,
    })
    .from(pointsTransactions)
    .where(eq(pointsTransactions.userId, snap.userId))
    .orderBy(desc(pointsTransactions.createdAt))
    .limit(50);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1
          className="font-display text-2xl font-extrabold tracking-tight"
          style={{ color: "var(--ed-ink)" }}
        >
          Reward points
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ed-mute)" }}>
          Earn on purchases &amp; referrals · 1 pt = ₹1 · redeem at checkout.
        </p>
      </div>

      <div
        className="flex items-center gap-4 rounded-2xl p-6"
        style={{ background: "var(--ed-ink)" }}
      >
        <span
          className="flex size-12 items-center justify-center rounded-xl"
          style={{ background: "rgba(141,198,63,0.15)" }}
        >
          <Coins className="size-6" style={{ color: "var(--ed-green)" }} />
        </span>
        <div>
          <div className="text-3xl font-extrabold text-white">
            {snap.pointsBalance.toLocaleString()}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-white/45">
            Available balance
          </div>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-2xl border bg-white"
        style={{ borderColor: "var(--ed-line)" }}
      >
        <div
          className="border-b px-5 py-3 text-sm font-bold"
          style={{ borderColor: "var(--ed-line)", color: "var(--ed-ink)" }}
        >
          Activity
        </div>
        {txns.length === 0 ? (
          <div
            className="px-5 py-12 text-center text-sm"
            style={{ color: "var(--ed-mute)" }}
          >
            No points activity yet. Earn points by enrolling in courses or
            referring friends.
          </div>
        ) : (
          <ul>
            {txns.map((t) => {
              const positive = t.delta >= 0;
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-4 border-b px-5 py-3 last:border-0"
                  style={{ borderColor: "var(--ed-line)" }}
                >
                  <div className="min-w-0">
                    <div
                      className="text-sm font-semibold"
                      style={{ color: "var(--ed-ink)" }}
                    >
                      {t.note ?? t.type.replace(/_/g, " ")}
                    </div>
                    <div
                      className="text-[11px]"
                      style={{ color: "var(--ed-mute)" }}
                    >
                      {formatDate(t.createdAt)}
                      {t.expiresAt
                        ? ` · expires ${formatDate(t.expiresAt)}`
                        : ""}
                    </div>
                  </div>
                  <span
                    className="shrink-0 text-sm font-extrabold tabular-nums"
                    style={{
                      color: positive
                        ? "var(--ed-green-dark)"
                        : "var(--ed-rose)",
                    }}
                  >
                    {positive ? "+" : ""}
                    {t.delta.toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
