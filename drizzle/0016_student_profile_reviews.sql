ALTER TABLE "students" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "date_of_birth" date;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "personal_info" jsonb;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "professional_info" jsonb;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "financial_info" jsonb;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "payment_mode_preference" varchar(40);--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "whatsapp_consent" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "terms_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "disclaimer_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "profile_completed_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE "course_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "course_id" uuid NOT NULL REFERENCES "programs"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "enrollment_id" uuid REFERENCES "enrollments"("id") ON DELETE SET NULL,
  "rating" integer NOT NULL,
  "body" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "course_reviews_course_idx" ON "course_reviews"("course_id");--> statement-breakpoint
CREATE INDEX "course_reviews_user_idx" ON "course_reviews"("user_id");--> statement-breakpoint
CREATE INDEX "course_reviews_tenant_idx" ON "course_reviews"("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_reviews_unique" ON "course_reviews"("course_id","user_id");
