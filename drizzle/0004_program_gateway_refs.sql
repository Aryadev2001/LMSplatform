ALTER TABLE "programs" ADD COLUMN "stripe_product_id" varchar(128);--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "razorpay_plan_id" varchar(128);--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "gateway_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "gateway_sync_error" text;
