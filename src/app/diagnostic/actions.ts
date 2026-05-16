"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { diagnosticSubmissions, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTenantFromRequest } from "@/lib/tenant";
import { ALL_QUESTION_IDS, REVENUE_BANDS } from "@/lib/diagnostic/questions";
import { scoreDiagnostic, type Answers } from "@/lib/diagnostic/scoring";

const SubmitSchema = z.object({
  answers: z.record(z.string(), z.number().int().min(1).max(5)),
  firmographics: z.object({
    fullName: z.string().min(2, "Enter your name").max(200),
    email: z.email("Enter a valid email"),
    phone: z.string().max(30).optional().or(z.literal("")),
    revenueBand: z.enum(REVENUE_BANDS.map((r) => r.value) as [string, ...string[]]),
    businessType: z.string().max(60).optional().or(z.literal("")),
    teamSize: z.string().max(30).optional().or(z.literal("")),
    yearsInBusiness: z.string().max(30).optional().or(z.literal("")),
  }),
});

export type SubmitResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function submitDiagnostic(
  input: z.infer<typeof SubmitSchema>,
): Promise<SubmitResult> {
  const parsed = SubmitSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid submission" };
  }

  const { answers, firmographics } = parsed.data;

  // Every scored question must be answered.
  const missing = ALL_QUESTION_IDS.filter((id) => typeof answers[id] !== "number");
  if (missing.length > 0) {
    return { success: false, error: "Please answer every question before submitting." };
  }

  const result = scoreDiagnostic(answers as Answers, {
    revenueBand: firmographics.revenueBand as never,
  });

  // Link to a signed-in user if there is one.
  let userId: string | null = null;
  try {
    const { userId: clerkId } = await auth();
    if (clerkId) {
      const [u] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkId, clerkId))
        .limit(1);
      userId = u?.id ?? null;
    }
  } catch {
    /* anonymous is allowed */
  }

  // Attribute the lead to the tenant whose site it was taken on (host
  // tenant; falls back to the default 'edt' tenant on apex/localhost).
  const tenant = await getTenantFromRequest();

  const [row] = await db
    .insert(diagnosticSubmissions)
    .values({
      userId,
      tenantId: tenant?.id ?? null,
      email: firmographics.email,
      name: firmographics.fullName,
      phone: firmographics.phone || null,
      answers,
      layerScores: result.layerScores,
      businessHealthScore: result.businessHealthScore,
      stage: result.stage,
      topBottlenecks: result.topBottlenecks,
      recommendedCourseSlug: result.recommendedCourseSlug,
      firmographics,
    })
    .returning({ id: diagnosticSubmissions.id });

  return { success: true, id: row.id };
}
