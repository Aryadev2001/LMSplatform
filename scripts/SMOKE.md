# Pre-launch smoke tests

Re-runnable health checks for the platform. Run them before a deploy/launch, or
any time you want to confirm production is healthy.

| Command | What it checks | Needs |
|---|---|---|
| `npm run smoke:http` | Every public page → 200; every gated route redirects to the **correct** login; the live service worker is the safe kill-switch. | nothing (defaults to `https://eurodigital.coach`) |
| `npm run smoke:db` | Hot-path indexes + launch columns exist; default `edt` tenant active; **no** duplicate/ghost accounts; **no** course stuck pending approval; AI-Catalog courses excluded from the marketplace; a real enrolment surfaces in the student dashboard. | `.env.local` (DATABASE_URL) |
| `npm run smoke:ui` | Headless (Edge) clickability sweep across 21 public pages — flags any overlay that eats clicks. | `playwright-core` + MS Edge installed |
| `npm run smoke` | Runs `smoke:http` then `smoke:db`. | `.env.local` |

Each script exits non-zero on failure, so they can gate CI/deploys.

### Targeting a different environment

```bash
# HTTP smoke against a preview/local URL
npx tsx scripts/smoke-http.ts http://localhost:3000
```

### Other headless probes (one-off, run with node)

- `node scripts/diag-overlays.mjs` — the clickability/overlay sweep (same as `smoke:ui`).
- `node scripts/diag-page.mjs` — drives the course page and asserts the "Enroll" button is clickable and navigates.

Both use `playwright-core` against the installed MS Edge (path hard-coded for
this Windows box — edit the `EDGE` const if yours differs).

> All smoke scripts are **read-only**. `smoke:db` only reports a stale pending
> course as a failure (it does not change data); approve it from the super-admin
> console, or with a one-off script.
