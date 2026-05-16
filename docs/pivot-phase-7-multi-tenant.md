# EDT Platform — Multi-Tenant Pivot (Phase 7) — Master Spec

> Saved verbatim from the phase-7 brief. This is the authoritative objective.
> Implementation **resolutions** vs the live codebase are recorded at the bottom
> under "Codebase Reconciliation".

## Goal

Pivot the single-tenant EDT platform to a **multi-tenant SaaS**. EDT becomes the
platform operator above many tenant institutes. Single database, row-level
multi-tenancy via `tenantId` on every tenant-scoped table.

### Four capabilities
1. Super-Admin dashboard (multi-role EDT team: SUPER_OWNER / SUPER_STAFF / SUPER_SUPPORT)
2. Whitelabeling (subdomain + logo + brand colors; custom domain via manual DNS queue)
3. Referral system (points + progressive tier unlocks Bronze/Silver/Gold/Platinum)
4. Master course push from super-admin to selected tenants (scoped copies, re-syncable)

### Tenancy
- Single Postgres DB, `tenantId` FK + index on every tenant-scoped table → new `Tenant` table.
- Every dashboard query scoped by `tenantId` resolved from subdomain/custom domain.
- Unscoped tenant query = security bug.

### Roles
- Super layer: `SUPER_OWNER` (full), `SUPER_STAFF` (ops, no team mgmt / no global financials),
  `SUPER_SUPPORT` (read-only + audited impersonate).
- Tenant layer: `TENANT_ADMIN`, `INSTRUCTOR` (enum slot only), `STUDENT`.
- Migration: existing `admin` → `TENANT_ADMIN`; create one `SUPER_OWNER` from `SUPER_OWNER_EMAIL`.

### Tenant identification
- Subdomain-first: `slug.edt.ae`.
- Custom domain via **manual DNS queue** (super-admin adds in Vercel dashboard by hand, then
  "Mark configured"). No Vercel API, no DNS polling.
- Reserved subdomains: www, app, api, admin, super, edt, mail, support.

### Payments
- Each tenant connects their **own Razorpay** (`razorpayKeyId` + encrypted `razorpayKeySecret`
  on Tenant). Money flows student → tenant directly. No platform-fee ledger.
- No Razorpay configured → setup banner, payment disabled.

### Referrals
- Code per student: `{tenantSlug}-{6char}`.
- Referred purchase → referrer earns `amount × tenantPointsPercent` (default 5%), 1pt = ₹1,
  12-month expiry, redeem ≤ 50% of cart (configurable per tenant).
- Tiers by ACTIVATED referral count: Bronze 1, Silver 5, Gold 15, Platinum 30. Progressive.
  Crossing a tier auto-creates free `Enrollment` rows for tenant-configured `TierReward` courses.

### Course push
- Master course `isMasterCourse=true`, no tenantId. Push = deep-clone into target tenants
  with `sourceCourseId` → master. Tenant content read-only; price + publish + tier-eligible
  editable. "Sync to tenants" re-pushes structure, keeps each tenant's price.

## Build order (with mandatory pause/verify gates)
1. Schema migration — **show SQL, pause for approval**, then backfill (dry-run first), make tenantId NOT NULL.
2. Tenant resolution middleware + `getTenantFromRequest()`. Smoke test no regressions.
3. Super-admin dashboard + role gates. **Pause for testing.**
4. Whitelabeling (branding, CSS vars).
5. Custom-domain manual DNS queue.
6. Referral system (signup, checkout redeem, tier unlock, tenant config, daily cron).
7. Master course push UI.

## Acceptance criteria (all must hold)
1. Existing EDT admin unchanged. 2. Existing students unchanged. 3. Multi super-admins,
correct gates. 4. New tenant from clean state works on `slug.edt.ae`. 5. Tenant A cannot see
Tenant B data via URL tampering (security test). 6. Cross-tenant course access blocked.
7. Custom-domain manual workflow end-to-end. 8. Referral earn flow. 9. Tier unlock + email.
10. Points redemption math correct, no negative orders. 11. Master push works, per-tenant
price, read-only content. 12. No unscoped tenant query (grep verify). 13. AuditLog on every
super-admin write.

## Out of scope this phase
Automated DNS/Vercel API; instructor sub-roles; EDT-bills-tenants billing; full email suite
(only: tenant invite, domain configured, referral activated, tier upgraded, points expiring);
public marketing site.

---

## Codebase Reconciliation (resolutions — read before building)

The brief was written assuming **Prisma + `src/middleware.ts`**. The live repo differs.
Resolutions (approved approach):

| Brief assumes | Reality | Resolution |
|---|---|---|
| Prisma (`prisma/schema.prisma`, `prisma migrate`) | **Drizzle ORM** (`src/db/schema.ts`, `drizzle-kit`) | Translate the Prisma models 1:1 to Drizzle pgTables. Use `drizzle-kit generate` to produce a real SQL migration file (not bare `db push`) so SQL can be reviewed before apply. |
| `src/middleware.ts` | **`src/proxy.ts`** (Next 16 rename) + Clerk `clerkMiddleware` | Extend `proxy.ts`. Tenant resolution runs inside the existing clerkMiddleware wrapper; `tenantId` injected via request headers. |
| `UserRole` enum w/ SUPER_* / TENANT_ADMIN / STUDENT | pg enum `["admin","coach","student"]`, app type `"admin"|"student"` | Add new enum values (Postgres allows ADD VALUE; cannot drop `coach`/`admin`). Keep legacy values; introduce `SUPER_OWNER, SUPER_STAFF, SUPER_SUPPORT, TENANT_ADMIN, INSTRUCTOR`. Backfill `admin`→`TENANT_ADMIN`, `student`→`STUDENT`. App `UserRole` type expands. |
| Razorpay exists | Stripe is mocked; **no Razorpay** | Store `razorpayKeyId/Secret` on Tenant per spec, but the checkout still uses the existing mock until real Razorpay is wired (separate task). Setup banner shown when keys absent. |
| Clerk Organizations for impersonation | Clerk used, **no orgs** | Impersonation = signed session-token swap + mandatory AuditLog (no Clerk org switch). |
| Git commits per step | **Not a git repo** | Offer `git init` before building so the per-step commits the brief wants are possible. |
| `Course` table | table is named `programs` (models a course) | Add tenant/master columns to `programs`. Keep table name to avoid mass refactor; it already represents a course. |

**Highest-priority invariant:** no tenant-scoped query without a `tenantId` filter.
When unsure, scope it and ask.
