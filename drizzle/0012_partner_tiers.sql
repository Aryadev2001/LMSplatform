CREATE TYPE "partner_tier" AS ENUM ('basic', 'standard', 'premium');--> statement-breakpoint
CREATE TYPE "partner_billing_status" AS ENUM ('none', 'active', 'trialing', 'past_due', 'canceled');--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "tier" "partner_tier" NOT NULL DEFAULT 'basic';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "billing_status" "partner_billing_status" NOT NULL DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "platform_stripe_customer_id" varchar(128);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "platform_stripe_subscription_id" varchar(128);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "platform_current_period_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "business_legal_name" varchar(240);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "business_reg_number" varchar(120);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "business_reg_doc_url" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "business_address_line1" varchar(240);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "business_address_line2" varchar(240);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "business_city" varchar(120);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "business_state" varchar(120);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "business_postal_code" varchar(40);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "business_country" varchar(2);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "business_phone" varchar(40);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "business_financial_info" jsonb;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "company_profile" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "company_socials" jsonb;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "owner_name" varchar(200);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "owner_title" varchar(120);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "owner_photo_url" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "owner_profile" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "owner_socials" jsonb;--> statement-breakpoint
UPDATE "tenants" SET "tier" = 'basic' WHERE "creator_only" = true;
