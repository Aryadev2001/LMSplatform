CREATE TABLE "exam_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "exam_id" uuid NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "enrollment_id" uuid REFERENCES "enrollments"("id") ON DELETE SET NULL,
  "started_at" timestamp with time zone NOT NULL DEFAULT now(),
  "submitted_at" timestamp with time zone,
  "answers" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "score" integer,
  "max_score" integer,
  "passing_marks" integer,
  "passed" boolean
);--> statement-breakpoint
CREATE INDEX "exam_attempts_user_idx" ON "exam_attempts"("user_id");--> statement-breakpoint
CREATE INDEX "exam_attempts_exam_idx" ON "exam_attempts"("exam_id");--> statement-breakpoint
CREATE INDEX "exam_attempts_tenant_idx" ON "exam_attempts"("tenant_id");
