# delivery-readiness — seed tasks

Starter tasks per investigator. Every task's deliverable is the **same shape**: one or more gap
items, each with **severity (blocker / major / minor)** + the **fix** + the **evidence**
(file:line, version, workflow:job, or a verify-against-live step). All read-only — no edits, no
installs, no deploys. Investigators should go beyond these seeds wherever the trail leads.

---

## readiness-devops-release (Release engineer)

- **R1. Fresh-clone reproducibility + demo-runs-first-try.** The demo must run flawlessly from a
  clean clone, so a fresh checkout must build and the funnel must run
  flawlessly on the first attempt. Walk `yarn install --frozen-lockfile → codegen:check →
  type-check → lint → format:check → build` on a clean Node 24 checkout, then the start path a
  fresh deploy would use (`yarn build && start`, or the Vercel deploy). Deliverable: any step that would
  fail on a fresh clone or make the first demo run stumble, with the assumption it depends on
  (e.g. system Node 18 where yarn refuses, a missing build-time `NEXT_PUBLIC_*`). Evidence:
  `package.json` scripts + `.nvmrc`.
- **R2. CI gate completeness & ordering.** Confirm `ci.yml` runs `codegen:check` *before*
  type-check and that `codegen:check` actually runs `graphql-codegen --check` (not just schema
  validity in `scripts/codegen-check.mjs`). Deliverable: any gap where a regression would slip
  through green. Evidence: `.github/workflows/ci.yml`, `scripts/codegen-check.mjs`, root `codegen:check`.
- **R3. Env matrix — build-time vs runtime.** Classify every key the app reads into
  build-time-inlined (`NEXT_PUBLIC_*`) vs runtime server-only, and confirm the demo-critical ones
  are present in Vercel **Production** at *build* time. Deliverable: per-key table + any key whose
  absence silently no-ops a feature. Evidence: grep `process.env.` under `apps/web`, `apps/web/.env`
  key names, `lib/site.ts`.
- **R4. Vercel deploy config.** There's no `vercel.json` and no root build override — confirm the
  inferred Root Directory / build command equals `yarn workspace @sorrel/frontend build`, and that
  `next.config.ts` `outputFileTracingIncludes` covers everything read at runtime (not just
  `schema.graphql` for `/api/graphql`). Deliverable: any runtime file missing from the trace.
  Evidence: `apps/web/next.config.ts`.
- **R5. Lockfile integrity post-018.** Confirm `yarn.lock` (yarn classic v1) still resolves with
  `--frozen-lockfile` after spec 018's MUI dep changes and isn't dirty. Deliverable: drift or a
  build relying on a fragile hoist. Evidence: `yarn.lock`, `apps/web/package.json` vs `packages/ui/package.json`.
- **R6. Spec-gate foot-guns + preview↔prod parity.** Flag any commit about to ship without a
  `Spec: NNN`→`approved: no` trailer, and any `NEXT_PUBLIC_*` that differs between Vercel Preview
  and Production such that a preview-link demo looks broken. Evidence: `git log`, `spec-gate.yml`.

---

## readiness-security-reviewer (Security reviewer)

- **S1. PostHog personal-key trap (headline).** Prove the proposed server-only
  `POSTHOG_PERSONAL_API_KEY` (spec 023) is never `NEXT_PUBLIC_*` and never read in / imported by a
  `"use client"` module. Deliverable: explicit all-clear or a blocker. Evidence: grep
  `PERSONAL_API_KEY` / `NEXT_PUBLIC_` across `apps/web`; trace read sites; `specs/023-*.md`.
- **S2. Audit every `NEXT_PUBLIC_*`.** Confirm each inlined key is genuinely non-sensitive (PostHog
  `phc_` ingestion key, Mixpanel token, site URL, Storyblok *public/preview* tokens) and that the
  privileged `STORYBLOK_PERSONAL_ACCESS_TOKEN` / `*_WEBHOOK_SECRET` / `*_PREVIEW_SECRET` stay
  un-prefixed. Deliverable: any privileged key at risk of inlining. Evidence: `apps/web/.env`, grep.
- **S3. Secrets-in-git.** Confirm `.env` is git-ignored and no real token value is committed.
  Deliverable: any tracked secret. Evidence: `.gitignore`, grep tracked files for `phc_`/`phx_`/`Bearer`.
- **S4. Input validation.** Review the EMAIL server action (`email-action.ts` /
  `email-validation.ts`) for safe coercion, length cap, no ReDoS, no PII logging; review the public
  GraphQL Route Handler (`app/api/graphql/route.ts`) for prod introspection/landing-page exposure
  and unbounded mutation inputs. Deliverable: validation gaps. Evidence: the named files.
- **S5. Preview/webhook route handlers.** Confirm `app/api/draft/route.ts` constant-compares the
  preview secret + blocks open redirects, `app/api/storyblok/revalidate/route.ts` uses
  `timingSafeEqual` + 500s on unset secret, and `app/api/draft/disable/route.ts` can't be abused.
  Deliverable: any weak/missing check. Evidence: the four `app/api/` handlers.
- **S6. Security headers/CSP + governance.** `next.config.ts` has no `headers()` and there's no
  `vercel.json` → no CSP/`frame-ancestors`/`X-Content-Type-Options`/`Referrer-Policy`. Recommend a
  concrete block (allowlisting PostHog/Mixpanel/Storyblok; `frame-ancestors` for the Storyblok
  editor iframe). Separately grep for any real-brand cat-food name/logo/asset (governance breach).
  Evidence: `next.config.ts`, `.claude/CLAUDE.md`.

---

## readiness-dependency-auditor (Dependency auditor)

- **D1. Compatibility table.** Build the version/risk table for the headline graph: Next 16.2.9,
  React 19.2.4, MUI `^9.1.1` + emotion `^11`, Apollo client `^4`/server `^5`/`@as-integrations/next ^4`,
  `next-intl ^4`, `@storyblok/react ^6`, posthog-js/mixpanel-browser, TS/ESLint. Resolved versions
  from `yarn.lock`, not just ranges. Deliverable: the table + per-row severity.
- **D2. MUI v9 ↔ React 19 ↔ Next 16.** Confirm `@mui/material ^9` + `@mui/material-nextjs` support
  React 19 + the emotion 11 peers under Next 16 App Router. Deliverable: any peer yarn-classic
  silently satisfied that shouldn't be. Evidence: `packages/ui/package.json`, `yarn.lock`.
- **D3. Transitively-hoisted `@mui` (post-018).** `apps/web` has no `@mui` dep yet compiles MUI via
  hoist from `packages/ui` (`transpilePackages` in `next.config.ts`). Flag remaining direct
  `@mui`/`@emotion` imports in `apps/web` source + confirm the `eslint.config.mjs` no-restricted-imports
  ban on `["@mui/*","@emotion/*"]` is active, and call out the hoist fragility. Evidence: grep
  `apps/web`, `apps/web/eslint.config.mjs`, the two `package.json`s.
- **D4. Prettier `.bin` gotcha.** Confirm installed `node_modules/prettier` is v3.x (expected
  `^3.8.4`), `.bin/prettier` resolves to it, and every prettier call uses the explicit
  `node node_modules/prettier/bin/prettier.cjs` path (not `.bin/prettier`, which can mis-hoist to
  v2.8.8 and false-fail format). Evidence: `node_modules/prettier/package.json`, root `package.json` scripts.
- **D5. Duplicates + peer warnings.** Count distinct resolved versions of React, emotion, graphql,
  @apollo/client, TypeScript in `yarn.lock`; reason about peer ranges yarn classic swallowed.
  Deliverable: any duplicate React/emotion (runtime-breaking) or likely-unmet peer. Evidence: `yarn.lock`.
- **D6. Workspace ranges + version split.** Flag the `"*"` vs pinned `"1.0.0"` inconsistency across
  `@sorrel/*` deps, and the root-vs-`apps/web` ESLint (`^10` vs `^9`) / TS split that could make the
  two lint passes disagree. Deliverable: hygiene/risk items. Evidence: every `package.json`.

---

## readiness-telemetry-conversion (Telemetry/conversion PM)

- **T1. Events fire live, not just to memory.** Confirm that without `NEXT_PUBLIC_POSTHOG_KEY` /
  `NEXT_PUBLIC_MIXPANEL_TOKEN` set on Vercel at build time, `createAppTracker()` falls to
  `memorySink` and nothing reaches the vendors. Deliverable: the verify-against-live step + the risk.
  Evidence: `app/[locale]/wizard/analytics.ts`, `posthog.ts`, `mixpanelSink.ts`.
- **T2. Seed actually ingested.** Confirm whether `seed-posthog.ts` / `seed-mixpanel.ts` were run
  against the live projects and that the ingested curve matches the canonical `RETENTION` (A
  PROFILE→RECIPES 0.55, B 0.78). Deliverable: empty/mismatched-dashboard risk + the check.
  Evidence: the three `seed-*.ts`, README/spec notes.
- **T3. /insights live-vs-static honesty.** `/insights` imports static `lib/insights-data.json`
  today; spec 023 (`approved: no`, `status: proposed`) proposes the live PostHog read. Deliverable:
  the credibility gap if presented as "live," and spec 023 as the closer (or, if shipped, confirm
  graceful fallback). Evidence: `insights/page.tsx`, `specs/023-*.md`.
- **T4. A/B flag resolves in prod with `variant` attached.** Confirm the `profile-input` flag exists
  + is rolled out (else `useVariant` silently uses the local 50/50 bucket), and that
  `step_completed`/`funnel_step_viewed` carry `variant` so the split is analysable. Deliverable: the
  unproven-link items + verify steps. Evidence: `useVariant.ts`, emit sites under `wizard/`.
- **T5. Attribution & double-fire.** Confirm each step emits exactly one `funnel_step_viewed` (no
  React 19 / react-compiler effect double-fire), abandonment + exit-intent recovery are computable,
  and the live app's curve shape matches the seed's claimed curve. Deliverable: attribution gaps.
  Evidence: emit sites, `seed-funnel.ts` `RETENTION`.
- **T6. Dashboards + the analytics demo holds under scrutiny.** The analytics story must survive a
  live, sceptical walkthrough — not just look right
  locally. Confirm a PostHog/Mixpanel funnel insight + dashboard exists showing per-step drop-off
  split by `variant` with the PROFILE→RECIPES lift, plus that `field_error` is emitted live
  (backing "free text creates friction"). Deliverable: the honest answer to "show me a real
  session / is this live or seeded / what's the sample size," with where each piece of evidence
  lives — so the maintainer can demo it without the story wobbling on a follow-up question.

---

## readiness-qa-engineer (Release-QA engineer)

- **Q1. Suite-green audit (the whole matrix).** Run the same five-job matrix `ci.yml` runs —
  `yarn workspace @sorrel/{domain,shared,analytics,api,frontend} test` — and confirm each exits 0
  on a fresh checkout (jest mutates nothing, so a read-only run is safe). Deliverable: any red
  suite, named test + reason, as an automatic blocker; otherwise the green all-clear. Evidence:
  the nine test files (`packages/domain/src/{pricing/plan,delivery/calendar}.test.ts`,
  `packages/shared/src/funnel.test.ts`, `packages/analytics/src/events.test.ts`,
  `services/api/src/resolvers.test.ts`, `apps/web/app/[locale]/wizard/{state,validation,
  email-validation}.test.ts`, `apps/web/lib/dietary.test.ts`), `ci.yml`.
- **Q2. Meaningful, not theatre.** For each test file judge whether it asserts behaviour + edge
  cases or just smoke-checks a happy value. Confirm depth where it should exist
  (`calendar.test.ts` 192 ln — cutoffs/blackout/weekend/lead-time; `resolvers.test.ts` 180 ln —
  plan **recompute** + invalid input; `state.test.ts` 134 ln — reducer transitions + guards). Flag
  thin files (`email-validation.test.ts` 23 ln, `dietary.test.ts` 25 ln) by naming the **specific
  untested branch** + the assertion to add. Deliverable: per-file verdict.
- **Q3. The missing Cypress happy-path e2e (HEADLINE — Tier-2 gap).** There is no `cypress/`,
  `e2e/`, or Playwright layer — confirm by glob, then make the missing browser-level run through
  the funnel (**CATS→PROFILE→RECIPES→DELIVERY→PLAN→EMAIL→SUMMARY**) the top gap: pick a delivery
  date in the calendar, submit EMAIL, assert SUMMARY renders the computed plan. Deliverable: the
  concrete spec shape — route-driven step nav (`/[locale]/wizard/[step]`), `data-test` selectors
  to add, calendar interaction (`packages/ui/src/DeliveryDatePicker.tsx`), intercept the analytics
  sink to assert `step_completed`/`funnel_step_viewed` — and the note that adding it needs an
  approved `specs/NNN-*.md` + `Spec: NNN` trailer. Evidence: `packages/shared/src/funnel.ts`
  (step order), the `[step]` route.
- **Q4. Determinism / flake risk.** Hunt tests that pass locally but flake in CI: real
  `Date.now()`/`new Date()` without a pinned clock (calendar/delivery is the prime suspect — CI
  runs UTC, a `de`/local-time date can drift), `Math.random`/unseeded ordering, real network/env
  not mocked, async without deterministic await. Deliverable: each risk with file + fix (inject a
  clock, freeze TZ, seed RNG). Evidence: grep `Date`/`Math.random`/`setTimeout`/`fetch` across the
  test files + `calendar.ts`.
- **Q5. Coverage of the calendar + analytics contract (demo-critical).** Two paths the demo leans
  on: (a) `packages/domain/src/delivery/calendar.ts` is tested but the interactive
  `packages/ui/src/DeliveryDatePicker.tsx` has **no test** — confirm + flag the gap between tested
  domain logic and untested UI selection; (b) `packages/analytics/src/events.test.ts` (73 ln) —
  confirm it asserts the full event set (`funnel_step_viewed`, `step_completed`, `field_error`,
  `funnel_abandoned`, `exit_intent_shown/recovered`) and `variant` carriage, since the conversion
  story depends on those payloads (hand live fan-out to telemetry; you own that the contract is
  tested). Deliverable: the two coverage gaps + the assertions to add.
- **Q6. Run-and-extend ergonomics + the pre-delivery manual smoke checklist.** (a) The
  deterministic-verification standard expects the maintainer to, from a clean clone: run one
  workspace's tests, run a single test by name
  (`jest -t`), and add a passing assertion — confirm a root aggregate `yarn test` exists (today
  only per-workspace `test` scripts do) and that the per-package + root `jest.config.ts` are
  consistent so a new test file is picked up without ceremony; flag anything that would make
  extending the suite fumble. (b) Produce a tight ordered manual smoke checklist the maintainer runs before the
  demo, each item with route + pass condition: landing (`/[locale]`); each wizard step in order
  (`/[locale]/wizard/[step]` — forward/back nav, validation blocks an empty/invalid EMAIL, PLAN
  reflects choices); the **calendar** (blocked dates disabled, a valid date persists into SUMMARY);
  **locale switch `en`⇄`de`** (no missing-key fallbacks, dates format per locale); **/insights**
  renders without a blank state; **Storyblok draft preview** (`apps/web/app/api/draft/route.ts`
  enters draft mode + the preview renders, `/api/storyblok/revalidate` round-trips — the Storyblok
  differentiator must work live); no console errors anywhere. Also confirm the **mobile Lighthouse
  95+** evidence is *current*, not a stale screenshot (`lighthouserc.json`, `docs/lighthouse.md`)
  and recommend re-running `yarn lighthouse` right before delivery so the number matches the UI on
  screen.
