CREATE TYPE "public"."custom_domain_status" AS ENUM('NONE', 'REQUESTED', 'CONFIGURED');--> statement-breakpoint
CREATE TYPE "public"."domain_request_status" AS ENUM('PENDING', 'IN_PROGRESS', 'CONFIGURED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."points_transaction_type" AS ENUM('EARNED_REFERRAL', 'REDEEMED_AT_CHECKOUT', 'EXPIRED', 'ADMIN_ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."referral_status" AS ENUM('PENDING', 'ACTIVATED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."referral_tier" AS ENUM('NONE', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('ACTIVE', 'SUSPENDED', 'TRIAL', 'CHURNED');--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'SUPER_OWNER';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'SUPER_STAFF';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'SUPER_SUPPORT';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'TENANT_ADMIN';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'INSTRUCTOR';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'STUDENT';--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"actor_role" "user_role" NOT NULL,
	"action" varchar(120) NOT NULL,
	"target_type" varchar(60) NOT NULL,
	"target_id" varchar(80) NOT NULL,
	"metadata_json" jsonb,
	"ip_address" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_push_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"master_course_id" uuid NOT NULL,
	"target_tenant_id" uuid NOT NULL,
	"pushed_by_id" uuid,
	"copy_course_id" uuid,
	"pushed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"synced_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "domain_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"domain" varchar(253) NOT NULL,
	"status" "domain_request_status" DEFAULT 'PENDING' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actioned_by_id" uuid,
	"actioned_at" timestamp with time zone,
	"notes" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "points_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" "points_transaction_type" NOT NULL,
	"points_delta" integer NOT NULL,
	"related_payment_id" uuid,
	"related_referral_id" uuid,
	"note" varchar(300),
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"referrer_id" uuid NOT NULL,
	"referred_user_id" uuid NOT NULL,
	"status" "referral_status" DEFAULT 'PENDING' NOT NULL,
	"first_purchase_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(63) NOT NULL,
	"name" varchar(200) NOT NULL,
	"logo_url" text,
	"brand_primary_color" varchar(16) DEFAULT '#8CC63F' NOT NULL,
	"brand_secondary_color" varchar(16) DEFAULT '#1AADE0' NOT NULL,
	"hero_tagline" varchar(240),
	"custom_domain" varchar(253),
	"custom_domain_status" "custom_domain_status" DEFAULT 'NONE' NOT NULL,
	"razorpay_key_id" varchar(128),
	"razorpay_key_secret" text,
	"referral_points_percent" double precision DEFAULT 5 NOT NULL,
	"referral_redeem_max_percent" double precision DEFAULT 50 NOT NULL,
	"referral_enabled" boolean DEFAULT true NOT NULL,
	"status" "tenant_status" DEFAULT 'ACTIVE' NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tier_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tier" "referral_tier" NOT NULL,
	"course_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "points_redeemed" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "is_master_course" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "source_course_id" uuid;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "tier_unlock_eligible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referral_code" varchar(32);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referred_by_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "points_balance" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "current_tier" "referral_tier" DEFAULT 'NONE' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tier_unlocked_at" jsonb;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_push_history" ADD CONSTRAINT "course_push_history_master_course_id_programs_id_fk" FOREIGN KEY ("master_course_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_push_history" ADD CONSTRAINT "course_push_history_target_tenant_id_tenants_id_fk" FOREIGN KEY ("target_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_push_history" ADD CONSTRAINT "course_push_history_pushed_by_id_users_id_fk" FOREIGN KEY ("pushed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_push_history" ADD CONSTRAINT "course_push_history_copy_course_id_programs_id_fk" FOREIGN KEY ("copy_course_id") REFERENCES "public"."programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_requests" ADD CONSTRAINT "domain_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_requests" ADD CONSTRAINT "domain_requests_actioned_by_id_users_id_fk" FOREIGN KEY ("actioned_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_transactions" ADD CONSTRAINT "points_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_transactions" ADD CONSTRAINT "points_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_transactions" ADD CONSTRAINT "points_transactions_related_payment_id_payments_id_fk" FOREIGN KEY ("related_payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_transactions" ADD CONSTRAINT "points_transactions_related_referral_id_referrals_id_fk" FOREIGN KEY ("related_referral_id") REFERENCES "public"."referrals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tier_rewards" ADD CONSTRAINT "tier_rewards_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tier_rewards" ADD CONSTRAINT "tier_rewards_course_id_programs_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "course_push_master_idx" ON "course_push_history" USING btree ("master_course_id");--> statement-breakpoint
CREATE INDEX "course_push_tenant_idx" ON "course_push_history" USING btree ("target_tenant_id");--> statement-breakpoint
CREATE INDEX "domain_requests_tenant_idx" ON "domain_requests" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "domain_requests_status_idx" ON "domain_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "points_txn_user_idx" ON "points_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "points_txn_tenant_idx" ON "points_transactions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "points_txn_expires_idx" ON "points_transactions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "referrals_pair_unique" ON "referrals" USING btree ("referrer_id","referred_user_id");--> statement-breakpoint
CREATE INDEX "referrals_tenant_idx" ON "referrals" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "referrals_referrer_idx" ON "referrals" USING btree ("referrer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_slug_idx" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_custom_domain_idx" ON "tenants" USING btree ("custom_domain");--> statement-breakpoint
CREATE INDEX "tenants_status_idx" ON "tenants" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "tier_rewards_unique" ON "tier_rewards" USING btree ("tenant_id","tier","course_id");--> statement-breakpoint
CREATE INDEX "tier_rewards_tenant_idx" ON "tier_rewards" USING btree ("tenant_id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_source_course_id_programs_id_fk" FOREIGN KEY ("source_course_id") REFERENCES "public"."programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_id_users_id_fk" FOREIGN KEY ("referred_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_tenant_idx" ON "payments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "programs_tenant_idx" ON "programs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "programs_source_idx" ON "programs" USING btree ("source_course_id");--> statement-breakpoint
CREATE INDEX "users_tenant_idx" ON "users" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_referral_code_idx" ON "users" USING btree ("referral_code");