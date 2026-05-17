import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  pgEnum,
  uuid,
  index,
  uniqueIndex,
  jsonb,
  doublePrecision,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------- Enums ----------
// Legacy lowercase values kept (Postgres can't drop enum values); phase-7
// adds the multi-tenant role set. Existing data is backfilled admin→TENANT_ADMIN,
// student→STUDENT in the separate backfill step.
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "coach",
  "student",
  "SUPER_OWNER",
  "SUPER_STAFF",
  "SUPER_SUPPORT",
  "TENANT_ADMIN",
  "INSTRUCTOR",
  "STUDENT",
]);

// ---------- Phase 7: multi-tenant enums ----------
export const tenantStatusEnum = pgEnum("tenant_status", [
  "ACTIVE",
  "SUSPENDED",
  "TRIAL",
  "CHURNED",
]);

export const customDomainStatusEnum = pgEnum("custom_domain_status", [
  "NONE",
  "REQUESTED",
  "CONFIGURED",
]);

export const referralTierEnum = pgEnum("referral_tier", [
  "NONE",
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
]);

export const referralStatusEnum = pgEnum("referral_status", [
  "PENDING",
  "ACTIVATED",
  "EXPIRED",
]);

export const pointsTxnTypeEnum = pgEnum("points_transaction_type", [
  "EARNED_REFERRAL",
  "REDEEMED_AT_CHECKOUT",
  "EXPIRED",
  "ADMIN_ADJUSTMENT",
]);

export const domainRequestStatusEnum = pgEnum("domain_request_status", [
  "PENDING",
  "IN_PROGRESS",
  "CONFIGURED",
  "REJECTED",
]);

export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "pending", // form submitted, not paid
  "paid", // payment captured, waiting for account
  "account_created", // Clerk user created
  "assigned", // admin assigned coach + program
  "cancelled",
  "refunded",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "succeeded",
  "failed",
  "refunded",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
]);

export const assignmentStatusEnum = pgEnum("assignment_status", [
  "open",
  "submitted",
  "reviewed",
  "archived",
]);

export const diagnosticStageEnum = pgEnum("diagnostic_stage", [
  "foundation",
  "growth",
  "scale",
]);

export const courseTierEnum = pgEnum("course_tier", ["low", "mid", "high"]);
export const courseTypeEnum = pgEnum("course_type", ["one_time", "subscription"]);
export const courseStatusEnum = pgEnum("course_status", [
  "draft",
  "published",
  "archived",
]);

// ---------- Phase 7: Tenant ----------
export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 63 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    logoUrl: text("logo_url"),
    brandPrimaryColor: varchar("brand_primary_color", { length: 16 })
      .notNull()
      .default("#8CC63F"),
    brandSecondaryColor: varchar("brand_secondary_color", { length: 16 })
      .notNull()
      .default("#1AADE0"),
    heroTagline: varchar("hero_tagline", { length: 240 }),
    customDomain: varchar("custom_domain", { length: 253 }),
    customDomainStatus: customDomainStatusEnum("custom_domain_status")
      .notNull()
      .default("NONE"),
    // Payments — each tenant connects their own gateway (secrets encrypted
    // at rest). They may use Razorpay or Stripe; paymentProvider marks the
    // active one ("razorpay" | "stripe" | null).
    razorpayKeyId: varchar("razorpay_key_id", { length: 128 }),
    razorpayKeySecret: text("razorpay_key_secret"),
    stripePublishableKey: varchar("stripe_publishable_key", { length: 128 }),
    stripeSecretKey: text("stripe_secret_key"),
    paymentProvider: varchar("payment_provider", { length: 16 }),
    // Referral config
    referralPointsPercent: doublePrecision("referral_points_percent")
      .notNull()
      .default(5.0),
    referralRedeemMaxPercent: doublePrecision("referral_redeem_max_percent")
      .notNull()
      .default(50.0),
    referralEnabled: boolean("referral_enabled").notNull().default(true),
    // Lifecycle
    status: tenantStatusEnum("status").notNull().default("ACTIVE"),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("tenants_slug_idx").on(t.slug),
    uniqueIndex("tenants_custom_domain_idx").on(t.customDomain),
    index("tenants_status_idx").on(t.status),
  ],
);

// ---------- Users (mirror of Clerk) ----------
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkId: varchar("clerk_id", { length: 64 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    fullName: varchar("full_name", { length: 200 }),
    avatarUrl: text("avatar_url"),
    role: userRoleEnum("role").notNull(),
    isSuperAdmin: boolean("is_super_admin").notNull().default(false),
    permissions: text("permissions").array().notNull().default([]),
    // Phase 7 — tenant scoping (NULL only for SUPER_* users)
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "cascade",
    }),
    // Phase 7 — referral
    referralCode: varchar("referral_code", { length: 32 }),
    referredById: uuid("referred_by_id").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
    pointsBalance: integer("points_balance").notNull().default(0),
    currentTier: referralTierEnum("current_tier").notNull().default("NONE"),
    tierUnlockedAt: jsonb("tier_unlocked_at"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("users_clerk_id_idx").on(t.clerkId),
    uniqueIndex("users_email_idx").on(t.email),
    index("users_role_idx").on(t.role),
    index("users_tenant_idx").on(t.tenantId),
    uniqueIndex("users_referral_code_idx").on(t.referralCode),
  ],
);

// ---------- Programs / Courses ----------
// Table stays "programs" (existing refs) but models an EDT Course.
export const programs = pgTable(
  "programs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 120 }),
    name: varchar("name", { length: 200 }).notNull(),
    tagline: varchar("tagline", { length: 240 }),
    description: text("description"),
    priceCents: integer("price_cents").notNull(), // INR paise
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    durationMonths: integer("duration_months").notNull().default(3),
    tier: courseTierEnum("tier").notNull().default("low"),
    type: courseTypeEnum("type").notNull().default("one_time"),
    badgeColor: varchar("badge_color", { length: 32 }),
    status: courseStatusEnum("status").notNull().default("draft"),
    requiresApplication: boolean("requires_application").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    stripePriceId: varchar("stripe_price_id", { length: 128 }),
    // Phase 7 — multi-tenant / master-course
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "cascade",
    }), // NULL only for master courses in EDT catalog
    isMasterCourse: boolean("is_master_course").notNull().default(false),
    sourceCourseId: uuid("source_course_id").references(
      (): AnyPgColumn => programs.id,
      { onDelete: "set null" },
    ),
    tierUnlockEligible: boolean("tier_unlock_eligible").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("programs_slug_idx").on(t.slug),
    index("programs_tenant_idx").on(t.tenantId),
    index("programs_source_idx").on(t.sourceCourseId),
  ],
);

// ---------- Modules ----------
export const modules = pgTable(
  "modules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 240 }).notNull(),
    description: text("description"),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (t) => [index("modules_course_idx").on(t.courseId)],
);

// ---------- Lessons ----------
export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 240 }).notNull(),
    videoUrl: text("video_url"),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    resources: jsonb("resources"),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (t) => [index("lessons_module_idx").on(t.moduleId)],
);

// ---------- Lesson progress ----------
export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    percentComplete: integer("percent_complete").notNull().default(0),
    lastWatchedAt: timestamp("last_watched_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("lesson_progress_unique").on(t.userId, t.lessonId)],
);

// ---------- Coaches (1:1 with users) ----------
export const coaches = pgTable("coaches", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  bio: text("bio"),
  expertise: text("expertise"),
  hourlyRateCents: integer("hourly_rate_cents"),
  isAcceptingStudents: boolean("is_accepting_students").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------- Students (1:1 with users) ----------
export const students = pgTable(
  "students",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    enrollmentId: uuid("enrollment_id").references(() => enrollments.id, {
      onDelete: "set null",
    }),
    assignedCoachId: uuid("assigned_coach_id").references(() => coaches.userId, {
      onDelete: "set null",
    }),
    assignedProgramId: uuid("assigned_program_id").references(() => programs.id, {
      onDelete: "set null",
    }),
    goals: text("goals"),
    phone: varchar("phone", { length: 30 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("students_coach_idx").on(t.assignedCoachId),
    index("students_program_idx").on(t.assignedProgramId),
  ],
);

// ---------- Enrollments (form + payment, may exist before user) ----------
export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fullName: varchar("full_name", { length: 200 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    phone: varchar("phone", { length: 30 }),
    notes: text("notes"),
    programId: uuid("program_id").references(() => programs.id, { onDelete: "set null" }),
    status: enrollmentStatusEnum("status").notNull().default("pending"),
    stripeSessionId: varchar("stripe_session_id", { length: 200 }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("enrollments_email_idx").on(t.email),
    index("enrollments_status_idx").on(t.status),
    uniqueIndex("enrollments_stripe_session_idx").on(t.stripeSessionId),
  ],
);

// ---------- Payments ----------
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    // Direct link to the student user (denormalized for fast per-student queries)
    studentUserId: uuid("student_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 200 }),
    stripeChargeId: varchar("stripe_charge_id", { length: 200 }),
    stripeCustomerId: varchar("stripe_customer_id", { length: 200 }),
    amountCents: integer("amount_cents").notNull(),
    refundedCents: integer("refunded_cents").notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    description: varchar("description", { length: 300 }),
    paymentMethodLabel: varchar("payment_method_label", { length: 60 }),
    receiptUrl: text("receipt_url"),
    stripeSyncedAt: timestamp("stripe_synced_at", { withTimezone: true }),
    // Phase 7 — tenant scoping + points redeemed at checkout
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "cascade",
    }),
    pointsRedeemed: integer("points_redeemed").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("payments_enrollment_idx").on(t.enrollmentId),
    index("payments_student_idx").on(t.studentUserId),
    index("payments_status_idx").on(t.status),
    index("payments_tenant_idx").on(t.tenantId),
    uniqueIndex("payments_pi_idx").on(t.stripePaymentIntentId),
  ],
);

// ---------- Sessions (1-on-1 coaching calls) ----------
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    coachId: uuid("coach_id")
      .notNull()
      .references(() => coaches.userId, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.userId, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(60),
    meetingUrl: text("meeting_url"),
    status: sessionStatusEnum("status").notNull().default("scheduled"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("sessions_coach_idx").on(t.coachId),
    index("sessions_student_idx").on(t.studentId),
    index("sessions_scheduled_idx").on(t.scheduledAt),
  ],
);

// ---------- Assignments ----------
export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    coachId: uuid("coach_id")
      .notNull()
      .references(() => coaches.userId, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.userId, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    status: assignmentStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("assignments_student_idx").on(t.studentId),
    index("assignments_coach_idx").on(t.coachId),
  ],
);

// ---------- Assignment submissions ----------
export const assignmentSubmissions = pgTable(
  "assignment_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.userId, { onDelete: "cascade" }),
    content: text("content"),
    fileUrl: text("file_url"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    feedback: text("feedback"),
    grade: varchar("grade", { length: 10 }),
  },
  (t) => [index("submissions_assignment_idx").on(t.assignmentId)],
);

// ---------- Messages ----------
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromUserId: uuid("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: uuid("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("messages_from_idx").on(t.fromUserId),
    index("messages_to_idx").on(t.toUserId),
    index("messages_thread_idx").on(t.fromUserId, t.toUserId),
  ],
);

// ---------- Relations ----------
export const usersRelations = relations(users, ({ one, many }) => ({
  coach: one(coaches, { fields: [users.id], references: [coaches.userId] }),
  student: one(students, { fields: [users.id], references: [students.userId] }),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
}));

export const coachesRelations = relations(coaches, ({ one, many }) => ({
  user: one(users, { fields: [coaches.userId], references: [users.id] }),
  students: many(students),
  sessions: many(sessions),
  assignments: many(assignments),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  user: one(users, { fields: [students.userId], references: [users.id] }),
  enrollment: one(enrollments, {
    fields: [students.enrollmentId],
    references: [enrollments.id],
  }),
  coach: one(coaches, { fields: [students.assignedCoachId], references: [coaches.userId] }),
  program: one(programs, {
    fields: [students.assignedProgramId],
    references: [programs.id],
  }),
  sessions: many(sessions),
  assignments: many(assignments),
  submissions: many(assignmentSubmissions),
}));

export const programsRelations = relations(programs, ({ many }) => ({
  students: many(students),
  enrollments: many(enrollments),
}));

export const enrollmentsRelations = relations(enrollments, ({ one, many }) => ({
  program: one(programs, { fields: [enrollments.programId], references: [programs.id] }),
  user: one(users, { fields: [enrollments.userId], references: [users.id] }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  enrollment: one(enrollments, {
    fields: [payments.enrollmentId],
    references: [enrollments.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  coach: one(coaches, { fields: [sessions.coachId], references: [coaches.userId] }),
  student: one(students, { fields: [sessions.studentId], references: [students.userId] }),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  coach: one(coaches, { fields: [assignments.coachId], references: [coaches.userId] }),
  student: one(students, { fields: [assignments.studentId], references: [students.userId] }),
  submissions: many(assignmentSubmissions),
}));

export const assignmentSubmissionsRelations = relations(assignmentSubmissions, ({ one }) => ({
  assignment: one(assignments, {
    fields: [assignmentSubmissions.assignmentId],
    references: [assignments.id],
  }),
  student: one(students, {
    fields: [assignmentSubmissions.studentId],
    references: [students.userId],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  fromUser: one(users, {
    fields: [messages.fromUserId],
    references: [users.id],
    relationName: "sentMessages",
  }),
  toUser: one(users, {
    fields: [messages.toUserId],
    references: [users.id],
    relationName: "receivedMessages",
  }),
}));

// ---------- Business X-Ray diagnostic submissions ----------
export const diagnosticSubmissions = pgTable(
  "diagnostic_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    email: varchar("email", { length: 320 }).notNull(),
    name: varchar("name", { length: 200 }),
    phone: varchar("phone", { length: 30 }),
    answers: jsonb("answers").notNull(),
    layerScores: jsonb("layer_scores").notNull(),
    businessHealthScore: integer("business_health_score").notNull(),
    stage: diagnosticStageEnum("stage").notNull(),
    topBottlenecks: jsonb("top_bottlenecks").notNull(),
    recommendedCourseSlug: varchar("recommended_course_slug", { length: 100 }),
    firmographics: jsonb("firmographics").notNull(),
    // Phase 7 — tenant the diagnostic was taken on (host tenant at submit
    // time). Nullable for super-context/edge; backfilled for history.
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("diagnostic_email_idx").on(t.email),
    index("diagnostic_user_idx").on(t.userId),
    index("diagnostic_created_idx").on(t.createdAt),
    index("diagnostic_stage_idx").on(t.stage),
    index("diagnostic_tenant_idx").on(t.tenantId),
  ],
);

// ============================================================
// Phase 7 — Multi-tenant tables
// ============================================================

// Tenant admin configures which course unlocks at which referral tier
export const tierRewards = pgTable(
  "tier_rewards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    tier: referralTierEnum("tier").notNull(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("tier_rewards_unique").on(t.tenantId, t.tier, t.courseId),
    index("tier_rewards_tenant_idx").on(t.tenantId),
  ],
);

// Referral link between two users within a tenant
export const referrals = pgTable(
  "referrals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    referrerId: uuid("referrer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    referredUserId: uuid("referred_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: referralStatusEnum("status").notNull().default("PENDING"),
    firstPurchaseAt: timestamp("first_purchase_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("referrals_pair_unique").on(t.referrerId, t.referredUserId),
    index("referrals_tenant_idx").on(t.tenantId),
    index("referrals_referrer_idx").on(t.referrerId),
  ],
);

// Append-only points ledger (User.pointsBalance is a cache of this)
export const pointsTransactions = pgTable(
  "points_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    type: pointsTxnTypeEnum("type").notNull(),
    pointsDelta: integer("points_delta").notNull(), // +earn / -redeem
    relatedPaymentId: uuid("related_payment_id").references(() => payments.id, {
      onDelete: "set null",
    }),
    relatedReferralId: uuid("related_referral_id").references(() => referrals.id, {
      onDelete: "set null",
    }),
    note: varchar("note", { length: 300 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("points_txn_user_idx").on(t.userId),
    index("points_txn_tenant_idx").on(t.tenantId),
    index("points_txn_expires_idx").on(t.expiresAt),
  ],
);

// Manual DNS request queue (super-admin actions it by hand in Vercel)
export const domainRequests = pgTable(
  "domain_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    domain: varchar("domain", { length: 253 }).notNull(),
    status: domainRequestStatusEnum("status").notNull().default("PENDING"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
    actionedById: uuid("actioned_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    actionedAt: timestamp("actioned_at", { withTimezone: true }),
    notes: varchar("notes", { length: 500 }),
  },
  (t) => [
    index("domain_requests_tenant_idx").on(t.tenantId),
    index("domain_requests_status_idx").on(t.status),
  ],
);

// Record of master-course pushes into tenant catalogs
export const coursePushHistory = pgTable(
  "course_push_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    masterCourseId: uuid("master_course_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    targetTenantId: uuid("target_tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    pushedById: uuid("pushed_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    copyCourseId: uuid("copy_course_id").references(() => programs.id, {
      onDelete: "set null",
    }),
    pushedAt: timestamp("pushed_at", { withTimezone: true }).defaultNow().notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }),
  },
  (t) => [
    index("course_push_master_idx").on(t.masterCourseId),
    index("course_push_tenant_idx").on(t.targetTenantId),
  ],
);

// Audit log — every super-admin write + sensitive tenant-admin action
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorRole: userRoleEnum("actor_role").notNull(),
    action: varchar("action", { length: 120 }).notNull(),
    targetType: varchar("target_type", { length: 60 }).notNull(),
    targetId: varchar("target_id", { length: 80 }).notNull(),
    metadataJson: jsonb("metadata_json"),
    ipAddress: varchar("ip_address", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("audit_actor_idx").on(t.actorUserId),
    index("audit_created_idx").on(t.createdAt),
  ],
);
