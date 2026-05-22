/**
 * Dumps everything we have on a student by email, so you can see whether
 * the profile data actually landed in Neon vs. the super-admin page is
 * just not surfacing it.
 *
 * Usage:
 *   npx dotenv -e .env.local -- tsx scripts/trace-student.ts you@email.com
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { users, students, enrollments } from "../src/db/schema";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Pass an email: tsx scripts/trace-student.ts you@email.com");
    process.exit(1);
  }

  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!u) {
    console.log(`No users row for ${email}`);
    process.exit(0);
  }
  console.log("\n=== users ===");
  console.log({
    id: u.id,
    clerkId: u.clerkId,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    tenantId: u.tenantId,
    studentCode: u.studentCode,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  });

  const [s] = await db.select().from(students).where(eq(students.userId, u.id)).limit(1);
  if (!s) {
    console.log("\n=== students ===\n(no row yet — the profile form was never saved)");
  } else {
    console.log("\n=== students ===");
    console.log({
      userId: s.userId,
      phone: s.phone,
      address: s.address,
      dateOfBirth: s.dateOfBirth,
      paymentModePreference: s.paymentModePreference,
      whatsappConsent: s.whatsappConsent,
      profileCompletedAt: s.profileCompletedAt,
      termsAcceptedAt: s.termsAcceptedAt,
      disclaimerAcceptedAt: s.disclaimerAcceptedAt,
      personalInfo: s.personalInfo,
      professionalInfo: s.professionalInfo,
      financialInfo: s.financialInfo,
      goals: s.goals,
      assignedProgramId: s.assignedProgramId,
    });
  }

  const enrols = await db.select().from(enrollments).where(eq(enrollments.userId, u.id));
  console.log(`\n=== enrollments (${enrols.length}) ===`);
  for (const e of enrols) {
    console.log({
      id: e.id,
      programId: e.programId,
      status: e.status,
      createdAt: e.createdAt,
    });
  }

  console.log("\nSuper-admin drill-down URL:");
  console.log(`  /super-admin/students/${u.id}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
