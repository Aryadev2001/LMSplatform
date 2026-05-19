ALTER TABLE "tenants" ADD COLUMN "stripe_webhook_secret" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "razorpay_webhook_secret" text;
