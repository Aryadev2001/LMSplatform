ALTER TABLE "tenants" ADD COLUMN "intro_video_url" text;--> statement-breakpoint
ALTER TABLE "course_reviews" ADD COLUMN "hidden_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "course_reviews" ADD COLUMN "hidden_reason" varchar(240);
