ALTER TABLE "tenants" ADD COLUMN "stripe_publishable_key" varchar(128);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "stripe_secret_key" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "payment_provider" varchar(16);--> statement-breakpoint
UPDATE "tenants" SET "payment_provider" = 'razorpay' WHERE "razorpay_key_id" IS NOT NULL AND "razorpay_key_secret" IS NOT NULL AND "payment_provider" IS NULL;
