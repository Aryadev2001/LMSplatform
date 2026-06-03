# Build Plan — One-Click Stripe Connect (institute → student payments)

Status: **planned, post-launch fast-follow** (not started). Written 2026-06-03.

**Goal:** Replace the "paste your Stripe API keys" gateway form with a one-click
**"Connect with Stripe"** OAuth flow. Institutes connect their own Stripe in one
click; courses auto-create as Products/Prices on their connected account (this
half already exists via `src/lib/payments/sync-plan.ts`); students pay the
institute directly; the platform commission (`tenants.platform_fee_bps`) is
deducted automatically as an application fee.

> Scope note — this is the **institute → student marketplace** gateway. It is
> separate from the **platform tier-subscription** Stripe (institutes paying the
> platform), which is configured via env vars (`STRIPE_PLATFORM_*`,
> `STRIPE_PRICE_*`) and is unchanged by this plan.

## Already built (≈70%)
- `syncPlanToGateway()` already calls `stripe.products.create()` +
  `stripe.prices.create()` on course create/edit and stores `stripeProductId` /
  `stripePriceId` with retry + a "Sync" button.
- Commission modelled per tenant (`platform_fee_bps`).
- Per-tenant gateway data model + encrypted-secret path exist (to keep for
  back-compat).

## Prerequisites (operator, in Stripe — has lead time)
- Enable **Connect** on the platform Stripe account; use **Standard accounts**
  (institutes run their own Stripe + KYC; simplest one-click OAuth).
- Copy the Connect **`client_id`** (`ca_…`).
- Set OAuth redirect URI: `https://eurodigital.coach/api/stripe/connect/callback`.
- ⚠️ Connect platform activation can require business verification — start early.
- Env to add: `STRIPE_CONNECT_CLIENT_ID` (reuse `STRIPE_PLATFORM_SECRET_KEY` as
  the platform key).

## Phase 1 — OAuth connect (~½ day)
- Schema (`tenants`): add `stripe_connect_account_id` (`acct_…`),
  `stripe_connect_status`, `stripe_connect_connected_at`. Keep existing
  `stripe_secret_key` / `payment_provider` for back-compat.
- `GET /api/stripe/connect/start` → build Stripe OAuth URL (`client_id` + signed
  `state` for CSRF + tenant scope) → redirect.
- `GET /api/stripe/connect/callback` → verify `state` →
  `stripe.oauth.token({ grant_type: 'authorization_code', code })` → store
  `acct_…`, set `payment_provider='stripe'`.
- `POST /api/stripe/connect/disconnect` → `stripe.oauth.deauthorize()` → clear.

## Phase 2 — Point product-sync at the connected account (~1–2 h)
- In `sync-plan.ts` (Stripe branch): instead of `new Stripe(tenantSecretKey)`,
  use the platform Stripe client with
  `{ stripeAccount: tenant.stripe_connect_account_id }` on products/prices.
  Everything else (id persistence, retry, sync button) stays.

## Phase 3 — Checkout with application fee (~½ day — money path, careful)
- Stripe checkout (`gateway.ts` / `beginCheckout`): create the Checkout
  Session / PaymentIntent on the connected account with
  `application_fee_amount = round(amount * platform_fee_bps / 10000)`
  (**direct charges** — institute is merchant of record, fee auto-routed).
- Webhook: single **Connect webhook** `/api/stripe/webhooks/connect` (events
  carry an `account` field) handling `checkout.session.completed` /
  `payment_intent.succeeded` → existing `fulfillOrderById`. Replaces the
  per-tenant webhook for Connect tenants.

## Phase 4 — Settings UI (~2–3 h)
- `Settings → Payment Gateway`: replace paste-keys form with **"Connect with
  Stripe"** button + connected status (account id, charges-enabled) +
  **Disconnect**. Keep Razorpay paste-keys (no identical one-click OAuth;
  optionally add Razorpay Route later).

## Phase 5 — Test-mode E2E (~2–3 h)
- Test connected account → OAuth connect → create course → verify the product
  appears on the connected account → run a test checkout → verify fee split +
  payout + fulfillment + webhook.

## Notes / risks
- Back-compat: keep the old paste-keys path working for any tenant already on it
  (currently none).
- Razorpay stays separate (no equivalent OAuth one-click).
- Keep the two Stripe systems distinct (marketplace vs tier-subscription).

**Estimate:** ~2 focused days. Best done as a post-launch fast-follow.

Related: [[project-coach-platform]]; payment files — `src/lib/payments/sync-plan.ts`,
`src/lib/payments/gateway.ts`, `src/lib/payments/fulfill.ts`,
`src/app/admin/(dashboard)/settings/payment-gateway-form.tsx`.
