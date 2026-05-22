import "dotenv/config";
import { eq, desc, inArray } from "drizzle-orm";
import { db } from "../src/db/client";
import { users, students } from "../src/db/schema";

async function main() {
  const recent = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      tenantId: users.tenantId,
      studentCode: users.studentCode,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(inArray(users.role, ["student", "STUDENT"]))
    .orderBy(desc(users.createdAt))
    .limit(15);

  console.log(`Most recent ${recent.length} students\n`);
  for (const u of recent) {
    const [s] = await db
      .select()
      .from(students)
      .where(eq(students.userId, u.id))
      .limit(1);
    console.log("---");
    console.log(
      "email:",
      u.email,
      "| name:",
      u.fullName ?? "(null)",
      "| joined:",
      u.createdAt.toISOString(),
    );
    console.log(
      "user.id:",
      u.id,
      "| tenantId:",
      u.tenantId,
      "| studentCode:",
      u.studentCode,
    );
    if (!s) {
      console.log("students: NO ROW (profile never saved)");
    } else {
      console.log(
        "phone:",
        s.phone,
        "| dob:",
        s.dateOfBirth,
        "| address:",
        s.address,
      );
      console.log(
        "paymentMode:",
        s.paymentModePreference,
        "| whatsapp:",
        s.whatsappConsent,
      );
      console.log(
        "profileCompletedAt:",
        s.profileCompletedAt?.toISOString() ?? "null",
        "| termsAt:",
        s.termsAcceptedAt?.toISOString() ?? "null",
        "| disclaimerAt:",
        s.disclaimerAcceptedAt?.toISOString() ?? "null",
      );
      console.log("personalInfo:", JSON.stringify(s.personalInfo));
      console.log("professionalInfo:", JSON.stringify(s.professionalInfo));
      console.log("financialInfo:", JSON.stringify(s.financialInfo));
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
