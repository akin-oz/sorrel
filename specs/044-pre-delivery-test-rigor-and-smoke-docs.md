---
spec: 044
title: Pre-delivery test rigor + manual smoke docs — pin the midnight-boundary resolvers test, add a seed-script length guard, plan + funnel + email + GraphQL-wiring coverage extensions, document the Cypress Stripe-secret prerequisites + Lighthouse re-run procedure, and check in the manual pre-demo smoke checklist
approved: yes
tier: 2 # JD coverage — pre-delivery test rigor
owner: services/api/src/resolvers.ts · services/api/src/resolvers.test.ts · packages/domain/src/pricing/plan.test.ts · packages/shared/src/funnel.test.ts · packages/analytics/src/seed-retention.test.ts (new) · apps/web/app/[locale]/wizard/email-validation.test.ts · docs/pre-delivery-smoke.md (new) · docs/lighthouse.md · README.md
---

# Problem / gap

The 2026-06-15 delivery-readiness audit (release-QA engineer) found seven
test-rigor gaps and one documentation gap. None of them is a behavioural
correctness bug — every unit suite passes today — but each leaves an
untested branch, a flake risk, or a maintainer-onboarding surface that
would surprise a fresh-clone reviewer. The audit also confirmed two
context corrections worth noting at the top of this spec:

- The "missing Cypress happy-path e2e" headline gap is **closed**.
  `apps/web/cypress/funnel/happy-path.cy.ts` walks the full
  CATS→PROFILE→RECIPES→DELIVERY→PLAN→EMAIL→SUMMARY→CHECKOUT path with
  the 4242 card; the workflow is in `.github/workflows/cypress.yml`.
- `packages/ui/src/DeliveryDatePicker.test.tsx` exists and is 43
  substantive cases. The gap was that it wasn't in the CI matrix —
  spec 040 closes that.

The seven test-rigor findings + one doc finding, with severity:

1. **MAJOR (QA-MAJOR-1) — `resolvers.test.ts:33-38` midnight-boundary
   flake.** The test calls `new Date()` to compute `today`, then
   `computeDeliveryEstimate()` internally calls `new Date()` again at
   `services/api/src/resolvers.ts:156`. Cross midnight between the two
   reads (00:00:00 to 00:00:00.000001 in CI's arbitrary clock) and
   `diffDays = DEFAULT_LEAD_DAYS - 1` < the threshold. Rare but real
   red-the-build risk.

2. **MAJOR (QA-MAJOR-3) — Cypress workflow's three Stripe secret
   prerequisites are undocumented.** `.github/workflows/cypress.yml`
   requires `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`,
   and `STRIPE_WEBHOOK_SECRET` to be provisioned as GitHub repository
   secrets before the e2e job can succeed. Neither the README nor
   `.claude/CLAUDE.md` mention this. A fresh-clone maintainer's first
   PR reds the Cypress job until they're added.

3. **MINOR (QA-MINOR-6) — `plan.test.ts` missing boundary cases.**
   `packages/domain/src/pricing/plan.test.ts` covers single cat, two
   cats, fractional kg, and empty household. Untested branches: 4-cat
   household at the UI maximum (4 × 5 kg = 60 kg total → 1800g/day);
   very light cat (`{ weightKg: 0.5 }` → 15g/day, confirming
   `Math.round` doesn't drop to zero); the `firstBox.amountMinor`
   integer-pence assertion after the `Math.round` in `plan.ts:72`.

4. **MINOR (QA-MINOR-7) — Resolvers' GraphQL wiring layer is
   untested.** `services/api/src/resolvers.test.ts` covers the
   exported helpers (`computeDeliveryEstimate`, `saveDraft`,
   `updateDraft`) directly, but the Apollo `executeOperation`
   round-trip — query parsing, input coercion, resolver dispatch,
   serialization — is never exercised. A rename of `updateDraft` is
   caught by TypeScript, but any future middleware (auth, input
   coercion, depth limiting per spec 041 M4) would go untested
   without an end-to-end resolver-layer test.

5. **MINOR (QA-MINOR-8) — `funnel.test.ts` has no explicit
   `isFunnelStep("CHECKOUT") === true` positive assertion.** Line 44
   asserts the lowercase rejection. The implicit coverage from the
   forward-iteration loop is sound but explicit is better.

6. **MINOR (QA-MINOR-9) — Lighthouse evidence is stale.**
   `docs/lighthouse.md` (commit `0ea57fc` from 2026-06-13) predates
   spec 034 (SSR drift fix), spec 036 (axe findings), spec 038
   (Storybook bootstrap), and spec 039 (CHECKOUT step with Stripe
   PaymentElement loaded at module scope). The CI Lighthouse gate
   measures `/` and `/wizard/cats` — neither imports `CheckoutForm` —
   so the perf numbers are unlikely to have regressed, but
   `loadStripe` at module scope on any page that imports
   `CheckoutForm` adds a third-party bundle. The numbers cited in
   the README (`93 / 95 / 100 / 92`) are two days and five UI commits
   old; they should be re-run before the demo.

7. **MINOR (QA-MINOR-10) — `email-validation.test.ts` missing edge
   cases.** 23 lines covering empty/whitespace, four malformed
   shapes, well-formed, and `+` tag. Missing: a 254+ character
   address (RFC 5321 — spec 041 adds the length cap, this spec adds
   the test that locks it), a `"test@@example.com"` double-at, and
   a bare-TLD `"owner@com"` clarification.

8. **MINOR (QA-MAJOR-4 doc surface) — No manual pre-delivery smoke
   checklist in tree.** The audit produced a 18-item smoke list (in
   the merged report); none of it is checked in. Demo day comes,
   the maintainer wants to "run the list before presenting", and
   the list lives only in the audit conversation. Capture it as a
   tracked doc.

The audit also surfaced a spec-043-derived gap: the seed scripts'
`RETENTION` arrays must have `FUNNEL_STEPS.length - 1` entries. Spec
043 fixes the immediate broken state; spec 044 adds the test that
prevents the same drift recurring.

No existing approved spec covers any of these items.

# Scope

The exact files this spec touches. No file outside these is edited.

## 1. Pin `resolvers.test.ts:33-38` against midnight-boundary flake

- Edit `services/api/src/resolvers.ts:156` (the
  `computeDeliveryEstimate` function): accept an optional
  `todayIso?: string` parameter, defaulting to
  `toIso(new Date())`. The function body uses `todayIso` everywhere
  it currently calls `new Date()`.
- Edit `services/api/src/resolvers.test.ts:33-38`: pin a constant
  `const today = "2026-06-12"` and pass it as
  `computeDeliveryEstimate(today)`. Assert
  `diffDays >= DEFAULT_LEAD_DAYS`. Remove the `new Date()` call from
  the test body.
- Add one more test asserting the function honours the injected
  `todayIso` parameter (pass a fixed date and confirm the earliest
  is `today + DEFAULT_LEAD_DAYS` rounded forward to the next
  deliverable weekday).
- Acceptance criterion: a `grep -nE 'new Date\(\)' services/api/src/resolvers.test.ts`
  returns zero hits.

## 2. Seed-script RETENTION-length guard

- Create a new test file
  `packages/analytics/src/seed-retention.test.ts` (or
  `apps/web/scripts/seed-retention.test.ts` — placement decision at
  approval; recommendation: a tiny new test under
  `packages/analytics/src/__tests__/` because the analytics
  workspace already runs jest in CI). The test imports
  `FUNNEL_STEPS` from `@sorrel/shared` and a new exported
  `RETENTION` constant from each of the three seed scripts.
- Decision A — exporting RETENTION. Currently the three `RETENTION`
  tables are file-local. Option A1: export each from its script
  (script can still be invoked directly via `tsx`; jest can
  `import { RETENTION } from "@frontend/scripts/seed-posthog"` via a
  relative path or a workspace alias). Option A2: extract the
  shared `RETENTION` table into a single new file
  `apps/web/scripts/seed-retention.ts` exporting it once, and have
  all three scripts import from there. Recommendation: **A2** — one
  source of truth eliminates the very drift this test guards
  against.
- The test asserts:
  ```ts
  expect(RETENTION.A.length).toBe(FUNNEL_STEPS.length - 1);
  expect(RETENTION.B.length).toBe(FUNNEL_STEPS.length - 1);
  ```
  A future `FUNNEL_STEPS` extension that omits a matching
  RETENTION-array bump reds CI immediately.

## 3. `plan.test.ts` boundary cases

- Edit `packages/domain/src/pricing/plan.test.ts`. Add three tests:
  - Four-cat household at UI max (`[{w: 5}, {w: 5}, {w: 5}, {w: 5}]`):
    expect `portionGramsPerDay === 1800`, `Math.round` invariant.
  - Ultra-light cat (`[{w: 0.5}]`): expect
    `portionGramsPerDay === 15` (not 0). Tests that `Math.round` of
    the percent-of-weight calc does not collapse to zero for the
    smallest UI weight value.
  - Integer-pence `firstBox.amountMinor`: build a plan, assert
    `Number.isInteger(plan.pricing.firstBox.amountMinor)`. Locks
    the `Math.round` at `plan.ts:72`.
- All three are additive; no existing assertion changes.

## 4. Resolvers' GraphQL wiring round-trip

- Edit `services/api/src/resolvers.test.ts`. Add a small block at
  the end of the file using
  `new ApolloServer({ typeDefs, resolvers })` + `server.executeOperation`
  to assert:
  - `query funnelDraft($id: ID!) { funnelDraft(id: $id) { id step } }`
    after a `saveDraft` call returns the saved draft.
  - `mutation updateFunnelPlan($draftId: ID!, $input: PlanInput!) {
updateFunnelPlan(draftId: $draftId, input: $input) { plan {
pricing { perDay { amountMinor } } } } }` returns a recomputed
    plan after `updateDraft`.
- One test for each of the two mutations gives full round-trip
  coverage at the GraphQL layer. Bonus: this exercises spec 041's
  input-length-cap helper indirectly — passing a 21-element
  `cats` array reds the test.

## 5. `funnel.test.ts` CHECKOUT positive assertion

- Edit `packages/shared/src/funnel.test.ts:44` block. Add one line:
  ```ts
  expect(isFunnelStep("CHECKOUT")).toBe(true);
  ```
  Plus, as a near-miss negative, add `expect(isFunnelStep("Checkout"))
.toBe(false)` to lock the case-sensitivity.

## 6. Lighthouse re-run procedure + freshness note

- Edit `docs/lighthouse.md`. Add a new "Re-running before delivery"
  section at the bottom with the exact command sequence:
  ```
  yarn workspace @sorrel/frontend build
  yarn lighthouse
  # then update the table in this file with the new medians
  ```
  Add a `Last updated:` header line at the top of the table block.
  The acceptance criterion is that the file shows a fresh `Last
updated:` value at delivery time (the maintainer updates it after
  the pre-demo re-run — see §9 below).

## 7. `email-validation.test.ts` edge cases

- Edit `apps/web/app/[locale]/wizard/email-validation.test.ts`. Add
  three tests:
  - 255-character email returns `{ email: "", error: "invalid" }`.
    Locks the RFC 5321 cap that spec 041 §7 introduces.
  - `"test@@example.com"` returns invalid.
  - `"owner@com"` returns invalid (bare TLD — current regex
    rejects, but a future "loose mode" relaxation would not).

## 8. Manual pre-delivery smoke checklist as a tracked doc

- Create `/Users/akinoztorun/Documents/projects/sorrel/docs/pre-delivery-smoke.md`
  with the 18-item smoke checklist from the audit. Each item:
  route → action → pass condition. The doc states it is the
  pre-demo manual run-list. Items cover: landing `/en`, every wizard
  step CATS through CHECKOUT (with the 4242 card), back-navigation,
  calendar month-nav, locale switch `en`/`de`, `/insights`,
  Storyblok draft preview, Storyblok revalidate webhook, console-clean
  walk, Lighthouse re-run.
- Edit `README.md`: add a one-line pointer in the "How this is enforced"
  or "Run it locally" section: "Before delivery, walk
  `docs/pre-delivery-smoke.md`."

## 9. README Cypress secret prerequisites

- Edit `README.md`. Add a short subsection titled `### Cypress
e2e — required GitHub secrets` (immediately after the existing
  CI/workflows section, or after `### Dev-only test hooks` from spec
  037). List the three secrets required by
  `.github/workflows/cypress.yml`:
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe test-mode publishable
    key (`pk_test_…`).
  - `STRIPE_SECRET_KEY` — Stripe test-mode restricted API key
    (`rk_test_…`, per the README's restricted-key guidance) or
    standard secret key.
  - `STRIPE_WEBHOOK_SECRET` — Stripe test-mode webhook signing
    secret (`whsec_…`).
- The subsection notes that without these three secrets, the
  Cypress workflow reds; CI's other jobs (unit tests, type-check,
  lint) do not require them.

# Contract impact

- `schema.graphql`: untouched.
- `packages/domain`: only test files change.
- `packages/analytics`: a new test file (and, under Decision A2, a
  shared `RETENTION` constant moved into a new file imported by
  the three seed scripts). The exported event types are unchanged
  by this spec (spec 043 handles the `variant` field addition).
- `packages/shared`: only test file changes.
- `services/api`: signature of `computeDeliveryEstimate` gains an
  optional parameter (additive, backward-compatible).
- `apps/web`: only test files + docs change. No runtime code change.
- No new npm/yarn dependencies. No new GraphQL operations.

# Out of scope

- Adding a variant-B Cypress happy-path spec. The current
  `happy-path.cy.ts` covers variant A only via the
  `window.__sorrelVariant` override; adding a parallel B walk would
  double the e2e wall-clock. Tracked, not in this spec.
- Coverage targets / thresholds via jest `coverageThreshold`. None
  set today; introducing a hard threshold here would scope-creep
  into a coverage-policy decision.
- Adding a per-route `headers()` end-to-end test for spec 041's CSP
  block. The CSP starts in report-only mode; the cypress assertion
  for headers comes after CSP is promoted to enforcing.
- Coverage of the `useExitIntent` hook beyond what
  `happy-path.cy.ts` already exercises.
- Replacing static `insights-data.json` with a live PostHog read in
  the test environment. The fallback is the right test surface.

# Acceptance criteria

- [ ] `yarn type-check && yarn lint && yarn format:check` — clean (0
      warnings, 0 errors).
- [ ] `yarn workspaces run test` — every workspace's jest suite green,
      including the new tests in §1, §2, §3, §4, §5, §7.
- [ ] `services/api/src/resolvers.test.ts` contains no `new Date()`
      call. The injected-`todayIso` test asserts the function honours
      the parameter.
- [ ] A new test file at
      `packages/analytics/src/__tests__/seed-retention.test.ts`
      (Decision A2) asserts `RETENTION.A.length` and `RETENTION.B.length`
      equal `FUNNEL_STEPS.length - 1`. Under Decision A2, the three
      seed scripts import `RETENTION` from
      `apps/web/scripts/seed-retention.ts`.
- [ ] `packages/domain/src/pricing/plan.test.ts` contains the three
      new boundary tests (4-cat, ultra-light, integer-pence).
- [ ] `services/api/src/resolvers.test.ts` contains a small
      `describe` block exercising `server.executeOperation` for both
      `funnelDraft` (query) and `updateFunnelPlan` (mutation).
- [ ] `packages/shared/src/funnel.test.ts` contains the explicit
      `isFunnelStep("CHECKOUT") === true` and the `"Checkout"` (mixed
      case) negative assertion.
- [ ] `docs/lighthouse.md` contains a "Re-running before delivery"
      section with the command sequence and a `Last updated:` header
      line. The line shows a date no older than `2026-06-15` at
      delivery time (maintainer-updated).
- [ ] `apps/web/app/[locale]/wizard/email-validation.test.ts`
      contains the three new edge-case tests (255-char, double-at,
      bare TLD).
- [ ] `/Users/akinoztorun/Documents/projects/sorrel/docs/pre-delivery-smoke.md`
      exists and contains the 18-item smoke checklist.
- [ ] `README.md` contains the
      `### Cypress e2e — required GitHub secrets`
      subsection listing the three secrets and the one-line pointer to
      `docs/pre-delivery-smoke.md`.
- [ ] No `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or
      `ignoreDeprecations` added anywhere in the diff.
- [ ] The implementation commit subject(s) include the `Spec: 044`
      trailer (canonical form).

# Analytics

None. This spec touches tests, documentation, and one function
signature; no typed funnel events change, no `packages/analytics`
event contract change, no spec-009 surface change. The seed-script
length guard (§2) protects the existing contract from silent drift —
it does not introduce a new event.
