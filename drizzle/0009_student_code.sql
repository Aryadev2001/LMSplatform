ALTER TABLE "users" ADD COLUMN "student_code" varchar(40);--> statement-breakpoint
CREATE UNIQUE INDEX "users_student_code_idx" ON "users" USING btree ("student_code");
