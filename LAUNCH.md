# Launch checklist — eurodigital.coach

Everything left to do before the platform is safe to serve real paying customers. Tick items off in order; later ones assume earlier ones are done.

> **What this doc is:** every external configuration step and content task that I (the codebase) can't do for you. Code-side work is shipped.

---

## 1. Secrets + connections (Vercel env vars)

All of these go in **Vercel → Project → Settings → Environment Variables**. Set scope to **Production + Preview + Development** unless noted.

### Database
- [ ] `DATABASE_URL` — Neon pooled endpoint (must contain `-pooler` in the host). **Rotate the password first** if it was ever leaked.
- [ ] (Optional) `MIGRATIONS_DATABASE_URL` — direct (non-pooled) endpoint for `drizzle-kit` migrations.

### Auth (Clerk)
- [ ] Move to **Production instance** in Clerk. Set:
  - [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts `pk_live_…`)
  - [ ] `CLERK_SECRET_KEY` (starts `sk_live_…`)
- [ ] In Clerk dashboard, add **satellite domains** for the Production instance:
  - [ ] `partner.eurodigital.coach`
  - [ ] `student.eurodigital.coach`
  - [ ] `admin.eurodigital.coach`
- [ ] In Clerk dashboard → **User & Authentication → Email, Phone, Username**:
  - [ ] Toggle **Phone number** ON (required for the OTP widget to actually send SMS)
  - [ ] Enable SMS verification

### File uploads
- [ ] `BLOB_READ_WRITE_TOKEN` — Vercel Blob store token. Verify it's set in **Production** scope, not just Development. Without it, doc upload in /admin/partner/onboard fails with a 500.

### Stripe (platform tier billing)
- [ ] In Stripe dashboard → **Products**, create:
  - [ ] "Partner Standard" with a recurring $49/month price
  - [ ] "Partner Premium" with a recurring $149/month price
- [ ] Copy each `price_…` ID.
- [ ] In Stripe → **Developers → API keys**, copy the **Secret key** (`sk_test_…` for staging, `sk_live_…` for prod).
- [ ] In Stripe → **Developers → Webhooks → Add endpoint**:
  - URL: `https://eurodigital.coach/api/webhooks/stripe-platform`
  - Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
  - Copy the **Signing secret** (`whsec_…`)
- [ ] In Stripe → **Settings → Billing → Customer portal**, click **Activate test link** (and again for live mode).
- [ ] Set in Vercel:
  - [ ] `STRIPE_PLATFORM_SECRET_KEY` — `sk_test_…` or `sk_live_…`
  - [ ] `STRIPE_PLATFORM_WEBHOOK_SECRET` — `whsec_…`
  - [ ] `STRIPE_PRICE_STANDARD` — `price_…` from Standard product
  - [ ] `STRIPE_PRICE_PREMIUM` — `price_…` from Premium product

### App URL
- [ ] `NEXT_PUBLIC_APP_URL` — `https://eurodigital.coach` (production), `https://<preview>.vercel.app` (preview)
- [ ] `NEXT_PUBLIC_ROOT_DOMAIN` — `eurodigital.coach` (drives the partner./student./admin. routing)

### Encryption
- [ ] `APP_ENCRYPTION_KEY` — 32-byte base64 string used to encrypt per-tenant gateway secrets. Generate once and never rotate without re-encrypting the existing rows.

### Email (optional — current code is a console-log stub)
- [ ] `RESEND_API_KEY` (or SES equivalent)
- [ ] Swap the seam in `src/lib/email.ts` to call the provider. The 7 templates (`referral_activated`, `tier_upgraded`, `points_expiring`, `tenant_invite`, `domain_configured`, `dashboard_unlocked`) all flow through one function — change once, all of them work.

### Error monitoring (optional)
- [ ] `npm install @sentry/nextjs`
- [ ] `SENTRY_DSN` env var
- [ ] Uncomment the import + `Sentry.init` in `src/instrumentation.ts`

---

## 2. Domain + DNS

- [ ] `eurodigital.coach` apex points at Vercel (already done in earlier session).
- [ ] `partner.eurodigital.coach` CNAME → Vercel (already aliased).
- [ ] `student.eurodigital.coach` CNAME → Vercel (already aliased).
- [ ] `admin.eurodigital.coach` CNAME → Vercel (already aliased).
- [ ] SSL certificates auto-provisioned by Vercel. Check the green padlock on all four.

---

## 3. Content + legal

### Legal pages (links exist; templates are pre-filled placeholders)
- [ ] `/legal/terms` — replace template copy with reviewed Terms of Service
- [ ] `/legal/privacy` — replace template copy with reviewed Privacy Policy
- [ ] `/legal/disclaimer` — replace template copy with reviewed Learner Disclaimer
- [ ] `/legal/refund` — replace template copy (already in DOCS map)
- [ ] `/legal/cookies` — replace template copy (already in DOCS map)

All five are served from `/legal/[doc]` with a yellow "starting template, not legal advice" banner. Edit the `DOCS` map in `src/app/legal/[doc]/page.tsx` once you have final copy.

### Marketing copy
- [ ] `/contact` — real support email + business address
- [ ] `/about` — real company info
- [ ] `/for-institutes` — real partner pitch
- [ ] `/help` — actual help articles, not just placeholder

### Cookie / consent banner (if targeting EU traffic)
- [ ] Pick a banner library (e.g. `react-cookie-consent`, `cookieyes`)
- [ ] Drop it in `src/app/layout.tsx`
- [ ] Wire your analytics to only fire after consent

---

## 4. Real production data

- [ ] Seed **3-5 real partner institutes** with real names + branding.
- [ ] Each institute publishes **at least 1 free + 1 paid course** so the marketplace doesn't look empty.
- [ ] Verify the home page floating-cards hero shows real, attractive courses.

---

## 5. Pre-launch end-to-end smoke tests

Do these manually after **section 1** is complete. Document the outcome (✅ / ❌ + screenshot) of each.

### Learner journey
- [ ] Sign up at `/sign-up` with a brand-new email → magic link arrives → click → land on `/student/profile?required=1` (NOT the dashboard).
- [ ] Fill the profile form, type a real mobile, tap **Send code** → SMS arrives → enter it → see ✓ Verified badge.
- [ ] Save profile → bounce to `/explore?welcome=1` with the green banner.
- [ ] Pick a paid course → land on `/courses/<slug>` → "Enrol now" → `/checkout` → enter Stripe test card (`4242 4242 4242 4242`) → success.
- [ ] Dashboard at `/student` unlocks; the course shows under My Courses.
- [ ] Welcome email arrives (once Resend is wired). Until then check Vercel logs for the `[email:dashboard_unlocked]` line.
- [ ] Open the course player, complete a lesson, take an exam, submit, see result.
- [ ] Leave a review with stars → it shows on `/courses/<slug>` and the storefront tab.

### Partner journey
- [ ] Sign up at `/sign-up` as "Partner — Basic" → magic link → `/admin/partner/onboard`.
- [ ] Complete the 5-step wizard (Business → Branding → Owner → Courses → Review). Upload a doc; verify it appears in `/super-admin/tenants/<id>` Partner Registration card.
- [ ] Create a course with the full course editor (language, features, intro video, certificate template). Add at least 2 modules + 4 lessons + 1 exam + 1 offer (voucher code).
- [ ] Verify the new course is **immediately visible** on `/explore` (cache invalidation working).
- [ ] As Basic, try to access `/admin/ai-services` → bounced to `/admin/partner` with upgrade banner.
- [ ] Click "Upgrade to Standard" → Stripe Checkout → enter test card → return to `/admin/partner/billing?upgraded=standard` → wait ~5s for webhook → refresh → tier shows Standard, AI Services unlocks in sidebar.

### Super-admin journey
- [ ] Sign in as `irfan@eurodigital.ae` → `/super-admin` → see real cross-tenant data (no demo placeholders).
- [ ] `/super-admin/students` → click a row → see the full registration profile, including verified-phone subline.
- [ ] `/super-admin/payments` → see the test-payment from the partner upgrade above.
- [ ] `/super-admin/reviews` → hide a review with a reason → confirm it disappears from `/courses/<slug>` and the storefront tab.
- [ ] `/super-admin/tenants/<id>` → open Feature Access card → grant `ai_services` to a Basic-tier tenant → confirm sidebar unlocks for that tenant.

### Cross-portal sign-out
- [ ] Sign in to `partner.eurodigital.coach`, then `student.eurodigital.coach` in another tab.
- [ ] Click Sign Out from the partner sidebar → student tab should also be logged out on refresh (cross-subdomain cookie share).

### Mobile sanity (do on an actual phone)
- [ ] Sign-up flow, OTP receive + enter, profile form, course player video playback.

---

## 6. Performance + observability

- [ ] Run the load test (`scripts/dump-recent-students.ts` is the helper used earlier) to confirm post-cache p50 numbers hold under load: `/` ≈ 800ms, `/courses/<slug>` ≈ 900ms, `/institute/<slug>` ≈ 750ms with zero non-2xx.
- [ ] Enable Vercel Analytics (free tier): Vercel dashboard → Analytics → Enable.
- [ ] (Optional) Add `@next/third-parties` for GA4 / Plausible.
- [ ] (Optional) Run a Lighthouse audit on `/` and `/explore` — confirm Performance ≥ 80, Accessibility ≥ 90.

---

## 7. Backup + disaster recovery

- [ ] Neon has automatic point-in-time recovery on paid plans. On free tier you get a daily snapshot. Decide which.
- [ ] If on free tier, consider a nightly `pg_dump` via a Vercel cron + Blob upload. (Not implemented; tell me if you want it.)
- [ ] Document the rollback playbook: `git revert <bad-commit> && git push` → Vercel auto-redeploys the previous version within 90 seconds.

---

## 8. Optional but recommended polish

- [ ] Add Lighthouse CI to `.github/workflows/` once perf budget is decided.
- [ ] Add Sentry (see above).
- [ ] Add `@vercel/og` social-share image generator for course pages.
- [ ] Submit `https://eurodigital.coach/sitemap.xml` to Google Search Console + Bing Webmaster.

---

## What's been shipped — quick reference

If you want to audit what the codebase has, here are the major surfaces:

| Surface | Notes |
|---|---|
| Public marketplace | `/`, `/explore`, `/courses/<slug>`, `/institute/<slug>` — all cached 60s, tag-invalidated on partner writes |
| Partner dashboard | `/admin/*` — onboarding wizard, course editor (with 0013 fields), exams, offers, branding, billing, partner-setup overview |
| Student dashboard | `/student/*` — profile (with OTP), courses, exams, reviews, certificates. Gated until profile complete + paid enrollment + verified phone. |
| Super-admin | `/super-admin/*` — tenants (full registration card), students, payments, reviews moderation, master courses, team, audit log |
| Auth | Clerk magic-link + phone OTP. Cross-subdomain session sharing. Sign-out from any sidebar drops the session everywhere. |
| Billing | Stripe Checkout for tier upgrades; Customer Portal for management; webhook updates `tenants.tier` |
| Schema | 17 migrations applied; tag-invalidated cache layer; load-tested |
| CI | `.github/workflows/ci.yml` runs build + lint on every PR |
| SEO | `/robots.txt`, `/sitemap.xml` (generated from live data) |

If anything in this list is unclear or you hit a snag mid-checklist, send me the section + your specific error message and I can fix or document the workaround.
