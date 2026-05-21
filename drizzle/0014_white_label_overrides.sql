ALTER TABLE "tenants" ADD COLUMN "hide_platform_logo" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "feature_overrides" jsonb NOT NULL DEFAULT '{}'::jsonb;
