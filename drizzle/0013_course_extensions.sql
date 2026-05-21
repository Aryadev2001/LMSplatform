CREATE TYPE "course_language" AS ENUM ('en', 'ar', 'hi');--> statement-breakpoint
CREATE TYPE "offer_type" AS ENUM ('reward_points', 'reward_percentage', 'voucher_code');--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "language" "course_language" NOT NULL DEFAULT 'en';--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "features" jsonb NOT NULL DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "intro_video_url" text;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "workshop_video_url" text;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "total_duration_hours" integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "disclaimer" text;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "terms_html" text;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "certificate_template_url" text;--> statement-breakpoint
ALTER TABLE "modules" ADD COLUMN "duration_minutes" integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE "modules" ADD COLUMN "intro_video_url" text;--> statement-breakpoint
CREATE TABLE "exams" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "program_id" uuid NOT NULL REFERENCES "programs"("id") ON DELETE CASCADE,
  "module_id" uuid REFERENCES "modules"("id") ON DELETE CASCADE,
  "title" varchar(240) NOT NULL,
  "duration_minutes" integer NOT NULL DEFAULT 30,
  "total_marks" integer NOT NULL DEFAULT 0,
  "passing_marks" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "exams_program_idx" ON "exams"("program_id");--> statement-breakpoint
CREATE INDEX "exams_tenant_idx" ON "exams"("tenant_id");--> statement-breakpoint
CREATE TABLE "exam_questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "exam_id" uuid NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "question" text NOT NULL,
  "options" jsonb NOT NULL,
  "marks" integer NOT NULL DEFAULT 1,
  "order_index" integer NOT NULL DEFAULT 0
);--> statement-breakpoint
CREATE INDEX "exam_questions_exam_idx" ON "exam_questions"("exam_id");--> statement-breakpoint
CREATE INDEX "exam_questions_tenant_idx" ON "exam_questions"("tenant_id");--> statement-breakpoint
CREATE TABLE "course_offers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "program_id" uuid NOT NULL REFERENCES "programs"("id") ON DELETE CASCADE,
  "type" "offer_type" NOT NULL,
  "value_int" integer NOT NULL DEFAULT 0,
  "voucher_code" varchar(40),
  "max_redemptions" integer,
  "redemptions_used" integer NOT NULL DEFAULT 0,
  "starts_at" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE UNIQUE INDEX "course_offers_voucher_unique" ON "course_offers"("tenant_id","voucher_code") WHERE "voucher_code" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "course_offers_program_idx" ON "course_offers"("program_id");--> statement-breakpoint
CREATE INDEX "course_offers_tenant_idx" ON "course_offers"("tenant_id");
