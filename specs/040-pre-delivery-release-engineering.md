---
spec: 040
title: Pre-delivery release-engineering hardening — vercel.json, CI build env, env-var onboarding, server-only PostHog host, Node-version doc, UI workspace in CI matrix, root yarn test, Lighthouse a11y threshold, storybook-static prettierignore
approved: yes
tier: 2 # JD coverage — fresh-clone reproducibility + CI gate hardness
owner: vercel.json · .github/workflows/ci.yml · jest.config.ts · package.json · README.md · .env.example · .prettierignore · lighthouserc.json · apps/web/lib/insights-posthog.ts
---

# Problem / gap

The 2026-06-15 delivery-readiness audit (release engineer + telemetry PM + dependency
auditor + QA engineer) found nine independent release-mechanics gaps that together
prevent a fresh-clone-and-import maintainer from reproducing the demo. None of
them has its own spec; they have been treated as ambient risks. They are small
individually and demo-breaking collectively (no `vercel.json` so Vercel import
deploys nothing; CI's production build runs without the Stripe publishable key
and silently ships a dead CHECKOUT; no `.env.example` so a fresh clone has no
template; a `NEXT_PUBLIC_*` env var is read in a server-only module; the README
"Run it locally" block jumps straight to `yarn install` on a default-Node-18
shell that yarn refuses; the calendar centerpiece's test file is not in the CI
matrix; there is no root `yarn test`; the Lighthouse a11y `minScore` is `0.9`
but the README claims "a11y 95"; and `storybook-static/` is not in
`.prettierignore` so `yarn format:check` falsely reds after a local Storybook
build).

The nine concrete findings, with severity from the audit:

1. **BLOCKER (Release-B4) — No `vercel.json`.** No `vercel.json` anywhere in the
   repo (`find` returns nothing). Next.js lives at `apps/web/next.config.ts`;
   there is no `next.config.*` at the repo root. The existing live deploy works
   only because the Vercel project already has Root Directory saved as
   `apps/web` in its dashboard. A fork-and-import maintainer who clicks "Import
   Project" on Vercel today starts from the repo root, finds no Next.js entry
   point, and ships nothing with no error signal until runtime.

2. **BLOCKER (Release-B5) — `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is absent from
   `ci.yml`'s Production build step.** `.github/workflows/ci.yml` line 61–62
   runs `yarn workspace @sorrel/frontend build` with no `env:` block.
   `CheckoutForm.tsx:24` reads `process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
?? ""`; the empty-string fallback at lines 28–29 means `loadStripe("")` is
   never called and the CI build's artifact has a dead CHECKOUT step. The
   Cypress workflow does set the key at build time (`cypress.yml:51`), so
   Cypress tests the correct state, but the CI production-build artifact is a
   different, degraded build. Adding the key here makes the CI artifact match
   what Cypress validates.

3. **MAJOR (Release-M1 + Telemetry-M1) — No `.env.example`, no committed env
   table.** `apps/web/.env` is a symlink to root `.env`. Root `.env` is
   gitignored and not committed. `apps/web` reads ~19 distinct `process.env.*`
   keys. Only Stripe is documented in `README.md` lines 205–215. Without
   `NEXT_PUBLIC_STORYBLOK_PUBLIC_TOKEN`, `apps/web/app/_cms/StoryblokProvider.tsx:21`
   gets `undefined` and the Visual Editor bridge silently doesn't initialise;
   the landing page renders fallback content that looks broken on a clean
   clone. Without `NEXT_PUBLIC_POSTHOG_KEY` or `NEXT_PUBLIC_MIXPANEL_TOKEN` at
   _build time_, `createAppTracker()` (`apps/web/app/[locale]/wizard/analytics.ts`
   lines 41–43) silently falls to `memorySink` — green build, dead telemetry.

4. **MAJOR (Release-M3) — `NEXT_PUBLIC_POSTHOG_HOST` is read in a server-only
   module.** `apps/web/lib/insights-posthog.ts:21` reads
   `process.env.NEXT_PUBLIC_POSTHOG_HOST`. The file's own JSDoc (lines 1–8)
   says explicitly "Server-only ... never imported by a client component". A
   server-only module reading a `NEXT_PUBLIC_*` key is semantically wrong (it
   bakes a value into the client bundle that no client reads) and produces
   `undefined` server-side if the key isn't set at build time (the fallback
   `https://eu.i.posthog.com` saves prod, but the key name is the bug).

5. **MAJOR (Release-M5) — README's "Run it locally" lacks a Node version
   step.** `.nvmrc` is `24`. Per the maintainer's memory
   (`toolchain-node24-and-prettier-symlink.md`), the macOS default Node 18
   shell makes yarn refuse to install. `README.md` lines 164–173 jumps
   straight to `yarn install` with no `nvm use` line. CI is safe because
   `actions/setup-node@v4` reads `.nvmrc` (`ci.yml:28`); local clone is not.

6. **MAJOR (QA-M2 + Release-MINOR-1) — `@sorrel/ui` is not in the CI test
   matrix.** `ci.yml` lines 46–59 runs `domain / shared / analytics / api /
frontend` only. `packages/ui/src/DeliveryDatePicker.test.tsx` is 816 lines
   of 43 substantive cases (close-chain, focus-trap, ESC, blocked-cell no-op,
   reduced-motion, dynamic closed-state, jest-axe closed + open, two-theme
   parity, SSR-fallback contract). The calendar centerpiece's tests never run
   in CI today. Root `jest.config.ts` also omits `packages/ui`, `packages/shared`,
   and `packages/analytics` from its projects array.

7. **MAJOR (QA-M4) — No root `yarn test` script.** Root `package.json` has no
   `"test"` entry. A maintainer following the deterministic-verification
   standard who runs `yarn test` from the root gets "command not found".

8. **MINOR (Release-MINOR-3) — Lighthouse a11y threshold mismatch.**
   `lighthouserc.json:12` sets `"categories:accessibility": ["error",
{ "minScore": 0.9 }]`. `README.md:244` claims "a11y 95". A run scoring 91
   passes the gate but contradicts the README. Either tighten the gate or
   align the README — the current pair is dishonest.

9. **MINOR (Release-MINOR-4) — `storybook-static/` is not in
   `.prettierignore`.** Root `eslint.config.mjs:16` ignores
   `**/storybook-static/**` for lint, but `.prettierignore` does not. After a
   local `yarn workspace @sorrel/ui build-storybook`, `yarn format:check`
   scans the generated HTML/JS and reds. CI is safe (it doesn't build
   Storybook before format:check); local is not.

No existing approved spec covers any of these nine items.

# Scope

The exact files this spec touches. No file outside these is edited.

## 1. `vercel.json`

- Create `/Users/akinoztorun/Documents/projects/sorrel/vercel.json`:
  ```json
  {
    "buildCommand": "yarn workspace @sorrel/frontend build",
    "outputDirectory": "apps/web/.next",
    "framework": "nextjs",
    "rootDirectory": "apps/web"
  }
  ```
- This makes a Vercel "Import Project" click reproducible without manual
  Root-Directory wiring in the dashboard.

## 2. `ci.yml` Production-build env

- Edit `.github/workflows/ci.yml` lines 61–62: add an `env:` block to the
  "Production build" step setting
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY }}`.
  This is the same secret already wired in `cypress.yml:51`. No new secret
  needs to be provisioned in GitHub.

## 3. `.env.example` + README env table

- Edit `/Users/akinoztorun/Documents/projects/sorrel/.gitignore`: the current
  `.env.*` pattern (line 22) matches `.env.example`. Add a single line
  `!.env.example` immediately after `.env.*` so the committed template is
  not silently ignored.
- Create `/Users/akinoztorun/Documents/projects/sorrel/.env.example` (committed,
  via the un-ignore exception above) listing every env key the app reads,
  classified into two sections:
  - **Build-time** (must be in the Vercel Production + Preview environment
    _and_ in local `.env` at the moment `yarn build` runs):
    `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`,
    `NEXT_PUBLIC_MIXPANEL_TOKEN`, `NEXT_PUBLIC_MIXPANEL_HOST`,
    `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_STORYBLOK_PUBLIC_TOKEN`,
    `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
  - **Runtime server-only** (Vercel dashboard only, never in the bundle):
    `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`, `POSTHOG_HOST` (see §4),
    `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STORYBLOK_PUBLIC_TOKEN`,
    `STORYBLOK_PREVIEW_TOKEN`, `STORYBLOK_PREVIEW_SECRET`,
    `STORYBLOK_WEBHOOK_SECRET`, `STORYBLOK_PERSONAL_ACCESS_TOKEN`,
    `STORYBLOK_REGION`.
  - Each value placeholder is the empty string or a stable sentinel
    (`pk_test_xxx`, `phc_xxx`, etc.) — never a real key.
- Edit `README.md` "Run it locally" section: extend the existing prose with a
  two-table env-var summary (build-time vs runtime), referencing
  `.env.example` as the canonical template. Add a sentence explaining how to
  populate `.env` locally and the equivalent Vercel-dashboard scoping.

## 4. Server-only `POSTHOG_HOST` rename in `insights-posthog.ts`

- Edit `apps/web/lib/insights-posthog.ts:21`: replace
  `process.env.NEXT_PUBLIC_POSTHOG_HOST` with `process.env.POSTHOG_HOST`. The
  fallback to `https://eu.i.posthog.com` stays unchanged. The constant comment
  near the top of the file is updated to note the env-var name change.
- `apps/web/app/[locale]/wizard/posthog.ts` (the _client-side_ SDK init) still
  legitimately reads `NEXT_PUBLIC_POSTHOG_HOST` for the ingestion endpoint —
  that usage stays as-is.
- `.env.example` lists both `POSTHOG_HOST` (server-only, used by
  `insights-posthog.ts`) and `NEXT_PUBLIC_POSTHOG_HOST` (client-side
  ingestion).

## 5. README Node-version-setup line

- Edit `README.md` "Run it locally" code block: prepend a single line
  `nvm use   # Node 24 — see .nvmrc; yarn refuses on Node 18` above
  `yarn install`. No new dependency, no new tooling — just one prose line +
  one shell line so a maintainer on the default macOS Node sees the gate
  before yarn refuses.

## 6. `@sorrel/ui` in the CI matrix + root `jest.config.ts` aggregation

- Edit `.github/workflows/ci.yml`: add a new step **between** the existing
  "Unit tests — domain" (line 47) and "Unit tests — shared" (line 49):
  ```yaml
  - name: Unit tests — ui (DeliveryDatePicker)
    run: yarn workspace @sorrel/ui test
  ```
- Edit root `jest.config.ts`: add `<rootDir>/packages/ui/jest.config.ts` and
  `<rootDir>/packages/shared/jest.config.ts` and
  `<rootDir>/packages/analytics/jest.config.ts` to the `projects` array.
  These workspaces already have their own `jest.config.ts` and `"test"`
  scripts; this makes `yarn jest` from the repo root cover them too.

## 7. Root `yarn test` script

- Edit root `/Users/akinoztorun/Documents/projects/sorrel/package.json`
  `scripts` block: add `"test": "yarn workspaces run test"`. This gives the
  maintainer one command to run the full unit matrix from the repo root,
  matching what `ci.yml` does step-by-step.

## 8. Lighthouse a11y threshold honesty

- Pick one of two paths at approval time (Decision A):
  - **A — tighten the gate:** edit `lighthouserc.json:12` to
    `"categories:accessibility": ["error", { "minScore": 0.95 }]`. This is
    the more honest path if the measured a11y median in
    `docs/lighthouse.md` is consistently ≥ 95.
  - **B — align the docs:** edit `README.md:244` to say "a11y 90" instead
    of "a11y 95", matching the actual gate.
- Recommendation: **A**. The measured a11y in `docs/lighthouse.md` (the
  table the README cites) is at or above 95 on every committed row.

## 9. `storybook-static/` in `.prettierignore`

- Edit `/Users/akinoztorun/Documents/projects/sorrel/.prettierignore`: add a
  new line `**/storybook-static/**`. Mirrors the lint ignore at
  `eslint.config.mjs:16`. No other change.

# Contract impact

None.

- `schema.graphql`: untouched.
- `packages/domain`: untouched.
- `packages/analytics`: untouched (the event contract is unchanged; spec 043
  covers the variant-carriage gap separately).
- `packages/ui` runtime behaviour: untouched (the CI step only runs existing
  tests).
- `apps/web` runtime: only `insights-posthog.ts` line 21 changes (env-var
  name), no behaviour change.
- No new npm/yarn dependencies. No new GraphQL types. No new typed
  analytics events.

# Out of scope

- Provisioning `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (or any other secret) in
  the GitHub repo's Settings. The spec assumes the secret already exists in
  the repo settings because `cypress.yml:51` already references it. If it
  does not, that is a maintainer operational task, not a spec deliverable.
- Provisioning any env var in the Vercel Production / Preview dashboard.
  Operational, not in tree.
- Swapping the local Stripe `sk_test_` for the README-recommended `rk_test_`
  restricted key — operational (and a `.env` change, which is gitignored).
- Restructuring the Lighthouse evidence in `docs/lighthouse.md`. Spec 044
  covers the re-run procedure and freshness; this spec only touches the
  threshold value.
- Branch protection on `main` (the spec-gate MAJOR finding) — that is a
  GitHub-settings operational task, not in tree.
- Any change to existing test files (spec 044 covers added test coverage).

# Acceptance criteria

- [ ] `yarn type-check && yarn lint && yarn format:check` — clean (0
      warnings, 0 errors).
- [ ] `yarn workspaces run test` — every workspace's jest suite green,
      including the now-wired `@sorrel/ui`.
- [ ] `yarn test` (from the repo root) runs the full matrix and exits 0.
- [ ] `/Users/akinoztorun/Documents/projects/sorrel/vercel.json` exists with
      the four keys above.
- [ ] `.github/workflows/ci.yml` Production-build step has the
      `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` env entry. A
      `grep -c 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY' .github/workflows/ci.yml`
      returns `>= 1`.
- [ ] `/Users/akinoztorun/Documents/projects/sorrel/.env.example` exists with
      every env key the app reads, in the two sections described above. The
      file is tracked (`git ls-files .env.example` returns the path).
- [ ] `apps/web/lib/insights-posthog.ts` no longer reads
      `process.env.NEXT_PUBLIC_POSTHOG_HOST`.
      `grep -n NEXT_PUBLIC_POSTHOG_HOST apps/web/lib/insights-posthog.ts`
      returns zero hits.
- [ ] `README.md` "Run it locally" block contains the `nvm use` line above
      `yarn install`.
- [ ] `README.md` contains a build-time vs runtime env-var summary table
      referencing `.env.example`.
- [ ] `.github/workflows/ci.yml` contains a step named
      `Unit tests — ui (DeliveryDatePicker)` between the domain step and the
      shared step.
- [ ] `lighthouserc.json` (under Decision A) shows `minScore: 0.95` for
      `categories:accessibility`. Under Decision B, `README.md:244` reads
      "a11y 90".
- [ ] `.prettierignore` contains a line matching `storybook-static`.
- [ ] No `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or
      `ignoreDeprecations` added anywhere in the diff.
- [ ] The implementation commit subject(s) include the `Spec: 040` trailer
      (canonical form).

# Analytics

None. This spec is release-mechanics and onboarding only; no typed funnel
events change, no `packages/analytics` change, no spec-009 surface change.
The `POSTHOG_HOST` rename in §4 changes only which env var the server-side
insights query reads — the events themselves are unchanged.
