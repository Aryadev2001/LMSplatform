ALTER TABLE "diagnostic_submissions" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "diagnostic_submissions" ADD CONSTRAINT "diagnostic_submissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "diagnostic_tenant_idx" ON "diagnostic_submissions" USING btree ("tenant_id");--> statement-breakpoint
UPDATE "diagnostic_submissions" d SET "tenant_id" = u."tenant_id" FROM "users" u WHERE d."user_id" = u."id" AND d."tenant_id" IS NULL AND u."tenant_id" IS NOT NULL;--> statement-breakpoint
UPDATE "diagnostic_submissions" d SET "tenant_id" = u."tenant_id" FROM "users" u WHERE d."tenant_id" IS NULL AND d."user_id" IS NULL AND lower(d."email") = lower(u."email") AND u."tenant_id" IS NOT NULL;--> statement-breakpoint
UPDATE "diagnostic_submissions" SET "tenant_id" = (SELECT id FROM "tenants" WHERE slug = 'edt') WHERE "tenant_id" IS NULL;
