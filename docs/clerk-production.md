# Clerk production config & auth notes

Operational notes for the live Clerk setup on `eurodigital.coach`. Read this
before touching auth env vars or the portal-subdomain routing.

## Current setup

- **Instance:** production, Frontend API on the custom domain
  `clerk.eurodigital.coach` (CNAME → `frontend-api.clerk.services`,
  Cloudflare-fronted, SSL verified). JWKS: `https://clerk.eurodigital.coach/.well-known/jwks.json`.
- **Vercel env (Production):**
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = `pk_live_…` (decodes to
    `clerk.eurodigital.coach`). Public — baked into the client at build time.
  - `CLERK_SECRET_KEY` = `sk_live_…`. **Sensitive** in Vercel: it cannot be
    read back via `vercel env pull` (returns empty). Verify its value in the
    Clerk dashboard, not the CLI.
  - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `…SIGN_UP_URL=/sign-up`,
    `…SIGN_IN_FALLBACK_REDIRECT_URL=/post-login`, `…SIGN_UP_FALLBACK_REDIRECT_URL=/post-login`.
  - `NEXT_PUBLIC_ROOT_DOMAIN` — **intentionally unset** (see below).
- **Local dev** uses the **test** instance (`pk_test_…` / `sk_test_…`) in
  `.env.local`. Do not swap those for live keys.

> The publishable and secret keys **must come from the same instance**. The pk
> encodes the Frontend API host but not the instance id; the sk is opaque.
> When in doubt, copy both from the same instance's API Keys page.

## CRITICAL: pk/sk must match the same instance

Symptom of a mismatch: you sign in successfully, then **every protected page
bounces you back to `/sign-in`** ("logged out everywhere", on the apex too).

This happened during the cutover: `CLERK_SECRET_KEY` was from a different
instance than the publishable key, so the server couldn't verify the session
JWT the client issued → signature failure → treated as signed-out.

### Diagnosing auth bounces — the `X-Clerk-Auth-Reason` header

On the request that 307s to `/sign-in`, read the `X-Clerk-Auth-Reason`
response header (DevTools → Network, or `curl -D -`):

| Value | Meaning | Fix |
|-------|---------|-----|
| `token-invalid` / `*-verification-failed` | **pk/sk instance mismatch** | Re-copy `sk_live_…` from the instance that owns the pk; update `CLERK_SECRET_KEY` in Vercel; redeploy |
| `session-token-and-uat-missing` after a successful sign-in | session cookie never set on the app domain | check Account Portal / redirect URLs |
| `session-token-expired` | clock / expiry | investigate separately |
| `session-token-and-uat-missing` for an anonymous request | normal (no session) | not an error |

To see which instance the deployed pk points at:

```bash
# publishable key is public — read it from the deployed HTML
PK=$(curl -s https://eurodigital.coach/ | grep -oE "pk_(live|test)_[A-Za-z0-9]+" | head -1)
echo -n "${PK#pk_live_}" | base64 -d   # → Frontend API host, e.g. clerk.eurodigital.coach$
```

## Portal subdomains are DISABLED (single-domain mode)

`NEXT_PUBLIC_ROOT_DOMAIN` is unset, so `getRootDomain()` returns `null` and
`/post-login` routes everyone with **same-domain relative paths**
(`/student`, `/admin`, `/super-admin`) on `eurodigital.coach`.

**Why:** with it set to `eurodigital.coach`, `/post-login` redirected a
just-signed-in student to `https://student.eurodigital.coach/student`. Clerk
did not share the session to that sibling subdomain (the portal subdomains
aren't registered with the live instance), so the user landed logged-out →
redirect loop. Keeping everything on the apex avoids the cross-subdomain hop
entirely; path-based dashboards work unchanged.

### To re-enable `student.` / `partner.` / `admin.` subdomains later

1. In the Clerk dashboard, register `student.eurodigital.coach`,
   `partner.eurodigital.coach`, `admin.eurodigital.coach` as satellite /
   allowed origins on the production instance.
2. Add `isSatellite` / `domain` config to `<ClerkProvider>` (per-host) and
   set `allowedRedirectOrigins`.
3. Only then restore `NEXT_PUBLIC_ROOT_DOMAIN=eurodigital.coach` in Vercel and
   redeploy. (`portalForHost` and `parseTenantHost` in `src/lib/tenant.ts`
   both key off this var, so tenant slug-subdomain storefronts come back too.)

## DNS (at the registrar, not Vercel)

5 Clerk CNAMEs on `eurodigital.coach`: `accounts`, `clerk`,
`clk._domainkey`, `clk2._domainkey`, `clkmail`. The portal/app subdomains
(`student`/`partner`/`admin`) point at Vercel.
