import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db } from "../src/db/client";
import { students, users } from "../src/db/schema";

/**
 * Simulates exactly what saveStudentProfile does, against the most recently
 * signed-up learner row, and prints the error if any. Bypasses the
 * requireRole gate to focus on the DB write.
 */
async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const [u] = email
    ? await db.select().from(users).where(eq(users.email, email)).limit(1)
    : await db
        .select()
        .from(users)
        .where(sql`role in ('student','STUDENT') and email not like 'seed.learner.%'`)
        .orderBy(sql`created_at desc`)
        .limit(1);
  if (!u) {
    console.error("No matching user.");
    process.exit(1);
  }
  console.log("Target user:", u.email, "id:", u.id, "tenantId:", u.tenantId);

  const now = new Date();
  const dobDate = "2000-01-15";

  try {
    console.log("Step 1: UPDATE users.full_name …");
    await db
      .update(users)
      .set({ fullName: "Trace Test", updatedAt: new Date() })
      .where(eq(users.id, u.id));
    console.log("  ok");
  } catch (e) {
    console.error("  users update FAILED:", e);
    process.exit(1);
  }

  try {
    console.log("Step 2: INSERT students (or upsert)…");
    await db
      .insert(students)
      .values({
        userId: u.id,
        phone: "+91 0000000000",
        address: "1 Test Lane",
        dateOfBirth: dobDate,
        personalInfo: { gender: "n/a", country: "IN", city: "Mumbai" },
        professionalInfo: { occupation: "engineer" },
        financialInfo: { incomeRange: "$50k – $100k / yr" },
        paymentModePreference: "card",
        whatsappConsent: true,
        termsAcceptedAt: now,
        disclaimerAcceptedAt: now,
        profileCompletedAt: now,
      })
      .onConflictDoUpdate({
        target: students.userId,
        set: {
          phone: "+91 0000000000",
          address: "1 Test Lane",
          dateOfBirth: dobDate,
          personalInfo: { gender: "n/a", country: "IN", city: "Mumbai" },
          professionalInfo: { occupation: "engineer" },
          financialInfo: { incomeRange: "$50k – $100k / yr" },
          paymentModePreference: "card",
          whatsappConsent: true,
          termsAcceptedAt: now,
          disclaimerAcceptedAt: now,
          profileCompletedAt: now,
        },
      });
    console.log("  ok");
  } catch (e) {
    console.error("  students upsert FAILED:");
    console.error(e instanceof Error ? `${e.message}\n${e.stack}` : e);
    process.exit(1);
  }

  const [verify] = await db
    .select()
    .from(students)
    .where(eq(students.userId, u.id))
    .limit(1);
  console.log("\nVerify (read back):");
  console.log(JSON.stringify(verify, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("UNCAUGHT:", e);
    process.exit(1);
  });
