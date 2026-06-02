# Partner enrolled-students roster & tier gating

How partners see who enrolls in their courses, and which capabilities are
gated behind a tier upgrade. Added 2026-06-02.

## What partners see

Every partner — including free **Basic** — sees who enrolled in their courses
at `/admin/students` (name, course, enrollment date, count). Two capabilities
are gated behind **Standard+**:

| Capability | Basic (free) | Standard+ |
|---|---|---|
| Enrolled-students roster (name, course, date) | ✅ | ✅ |
| Contact (email), profile, progress | ❌ "Contact hidden" + upgrade banner | ✅ |
| Per-student detail page (`/admin/students/<id>`) | ❌ redirect to upgrade | ✅ |
| Assign a course to a student | ❌ "Upgrade" | ✅ |
| Publish a **paid** course (price > 0) | ❌ price locked to free + hint | ✅ |
| Publish **free** courses | ✅ | ✅ |

The roster query counts users with a real enrollment (`paid` /
`account_created` / `assigned`) in one of the tenant's courses — so free-course
enrollees who completed checkout appear too.

## Implementation

Built on the existing tier-lock system (`src/lib/tier-lock.ts`). Two feature
keys were added to the `FEATURES` catalog, both `minTier: "standard"`:

- `paid_courses` — charge above ₹0 for a course.
- `student_details` — see contact/profile/progress, the detail page, and assign.

Gating model (`hasFeatureFor`): an explicit per-tenant override in
`tenants.feature_overrides` wins; otherwise the tier default applies
(`standard`/`premium` unlock; `basic` is locked). Super-admins bypass all gates.

### Enforcement points (server-authoritative — UI hints can't be bypassed)

- **Student detail page** — `requireFeature("student_details")` at the top of
  `src/app/admin/(dashboard)/students/[userId]/page.tsx` (redirects Basic to
  `/admin/partner?locked=…`).
- **Students list** — `hasFeature("student_details")` in
  `src/app/admin/(dashboard)/students/page.tsx` gates email, View/Assign, and
  shows the upgrade banner.
- **Paid courses** — `assertPriceAllowed` in
  `src/app/admin/(dashboard)/actions.ts` blocks `priceCents > 0` in BOTH
  `createProgram` and `updateProgram` unless `hasFeature("paid_courses")`. The
  program dialog also locks the price field (`canPublishPaid` prop) as a hint.

### Super-admin control

Grant/revoke either feature per-tenant at `/super-admin/tenants/<id>`
(overrides beat the tier default). Backed by `FeatureOverrideSchema`
(`src/app/super-admin/actions.ts`) and `FEATURE_INFO`
(`tenant-edit-form.tsx`). No schema change — uses the existing
`feature_overrides` jsonb.

## Verifying

Read-only audit of the gating decision for every tenant against live data:

```bash
npx dotenv -e .env.local -- npx tsx scripts/verify-tier-gating.ts
```

Expected: `basic` → LOCKED on both; `standard`/`premium` (or an override) →
unlocked.

To see the unlocked UI without a partner login, super-admins can **Open as
tenant** (impersonate) from the tenant detail page, after bumping that tenant
to Standard or granting the overrides.

## Adding another gated feature (3 steps)

Per `tier-lock.ts`: (1) add the key to `FEATURES`; (2) call
`requireFeature(key)` (or `hasFeature(key)`) on the route; (3) add it to
`FeatureOverrideSchema` + `FEATURE_INFO` so super-admin can override it.
