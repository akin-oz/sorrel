---
spec: 032
title: Bootstrap Cypress in apps/web with a funnel happy path + DeliveryDatePicker real-browser catalog, gated in CI
status: proposed
approved: yes
tier: 1 # the e2e gate the centerpiece needs; specs 025/028/029 have nowhere to land without it
owner: apps/web
---

> Roadmap note: this is the "Phase 0" prerequisite from the centerpiece
> test-coverage audit AND the Tier-2 "one Cypress happy path" goal called out
> in the README roadmap. Spec **024** pinned the jsdom-reachable half of the
> DeliveryDatePicker behaviour. Several failure modes — real Tab focus-trap
> order, roving `document.activeElement` updates, scrim translucency, body
> scroll-lock, animation-frame timing, touch tap behaviour, 44 px touch targets
> at narrow viewport, focus-ring visibility, modal not clipping on short
> viewports, and TZ-matrix correctness — are invisible to jsdom and need a real
> browser. The funnel's whole-flow correctness (CATS → PROFILE → RECIPES →
> DELIVERY → PLAN → EMAIL → SUMMARY) is likewise unverified end-to-end. This
> spec ships the Cypress infra, the funnel happy path, and the C-rows from the
> catalog that **do not** ride approved specs 025, 028, or 029. Those rows ship
> alongside each spec's implementation, not here.

# Problem / gap

The repo has **no Cypress today**. Verified from the snapshot:

- `apps/web/package.json` `devDependencies` (lines 35–45) contains no
  `cypress`, `start-server-and-test`, or `cypress-axe` entries; the `scripts`
  block (lines 5–16) has no `cypress:open` / `cypress:run` / `e2e` targets.
- `.github/workflows/` contains `ci.yml`, `lighthouse.yml`, and `spec-gate.yml`
  — no `cypress.yml`.
- No `apps/web/cypress.config.ts` and no `apps/web/cypress/` tree exist.

Spec 024 (`approved: yes`) added a Jest + Testing Library + jest-axe scaffold
inside `packages/ui` and locked the close-chain, blocked-NO-OP, and
return-focus behaviours that jsdom can express. The remaining behaviours
identified in the centerpiece test-coverage audit cannot be expressed in jsdom:

- **C-01** — real Tab focus-trap order across the dialog's interactive subtree.
- **C-03** — Arrow keys must update **real** `document.activeElement`, not just
  a focused-ref shadow.
- **C-04** — exactly one `<button class="sdp-cell">` carries `tabIndex===0` at
  any point during a session.
- **C-07** — backdrop click leaves no zombie `.sdp-modal` node in the DOM after
  the exit chain finishes.
- **C-11** — scrim `background-color` must resolve to an alpha < 1.
- **C-12** — body scroll is locked while the dialog is open.
- **C-16 / C-17** — enter and exit animations actually play for ≥ 160 ms
  (animation-frame timing, not just `data-state` strings).
- **C-18** — backdrop **touch** tap closes without committing.
- **C-19** — every Change / Cancel / Confirm / cell has `clientHeight >= 44` at
  a 375 px viewport (CSS resolution, not JSX).
- **C-20** — focused cell renders the double-ring `box-shadow`.
- **C-21** — focus ring does **not** leak onto blocked cells.
- **C-22** — modal does not clip on a 667 × 375 short viewport.
- **C-23** — `/wizard/delivery` step actually wires the picker to the funnel
  state (smoke).
- **C-24** — same `today` under `TZ=America/Los_Angeles` and `TZ=Asia/Tokyo`
  produces an identical picker (the closed-card day number and the rendered
  earliest cell).

The funnel happy path — the full CATS → PROFILE → RECIPES → DELIVERY → PLAN →
EMAIL → SUMMARY walk — has unit-level coverage at every step (spec 016 CATS,
spec 020 validation, spec 013 PLAN/EMAIL, spec 017 SUMMARY) but no end-to-end
test ever proves the steps connect. A regression in `useFunnel()`'s reducer,
the `/wizard/[step]` router, the EMAIL server action's `redirect()`, or the
PLAN→EMAIL Continue wiring would ship green today.

No existing approved spec covers any of this. Spec 001 defines the picker.
Spec 024 stops at jsdom. Specs 025, 028, 029 are queued but cover semantic
hardening, hover/press, and reduced motion — not the green-field e2e runner.
The Lighthouse workflow (`.github/workflows/lighthouse.yml`) gates mobile
budgets, not user-flow interaction. CI (`.github/workflows/ci.yml`) runs the
unit-test matrix but not a browser.

This spec covers the green-field Cypress bootstrap, the **funnel happy path**
(one deterministic CATS → SUMMARY walk under variant A, asserting URL
transitions, no error states, the assembled SUMMARY, and that the typed
funnel events fire for every step), the **DeliveryStep smoke** that proves
the picker is wired to the funnel reducer, and the **catalog rows that do not
ride another approved spec**: C-01, C-03, C-04, C-07, C-11, C-12, C-16, C-17,
C-18, C-19, C-20, C-21, C-22, C-23, C-24.

# Scope

## Phase 0 — Cypress bootstrap (net-new infra)

Files added:

- `apps/web/package.json`
  - `devDependencies`: add `cypress`, `start-server-and-test`, `cypress-axe`
    (versions pinned by the implementer when this lands; the implementation PR
    notes the chosen majors in the commit body).
  - `scripts`: add
    - `cypress:open` — `cypress open`
    - `cypress:run` — `cypress run`
    - `e2e` — `start-server-and-test dev http://localhost:3000 cypress:run`
- `apps/web/cypress.config.ts`
  - `e2e.baseUrl: "http://localhost:3000"`.
  - Fixed-clock seed strategy: tests opt in with
    `cy.clock(new Date("2026-06-12T09:00:00Z"))` so the earliest-deliverable
    arithmetic is deterministic regardless of when CI runs.
  - Viewport defaults declared in two named configurations: `375x667` (mobile)
    and `1280x800` (desktop). Per-test override via `cy.viewport(...)`.
  - TZ-env strategy: the config reads `process.env.TZ` and exposes it as
    `Cypress.env("TZ")` so the C-24 row can be invoked twice from CI under
    `TZ=America/Los_Angeles` and `TZ=Asia/Tokyo`.
- `apps/web/cypress/support/e2e.ts`
  - Imports `cypress-axe` once and re-exports nothing (side-effect import for
    the `cy.injectAxe` / `cy.checkA11y` extensions).
  - Imports `./commands.ts`.
- `apps/web/cypress/support/commands.ts`
  - `cy.openDeliveryPicker()` — visits `/wizard/delivery` (default locale
    folder `en`), waits for the closed-card "Change" button to be visible,
    clicks it, waits for the dialog `[role="dialog"]` to appear.
  - `cy.injectAxe()` — wraps the `cypress-axe` install so test files don't
    repeat the import path.
  - `cy.setReducedMotion()` — declared here for use by reduced-motion specs
    later, but **not consumed in this spec**; it exists so specs 029's e2e
    rows can land without re-touching `commands.ts`. The command sets the
    OS-level preference via `Cypress.automation("remote:debugger:protocol", …)`
    using Chrome DevTools' `Emulation.setEmulatedMedia` with feature
    `prefers-reduced-motion: reduce`.
- `apps/web/tsconfig.json` — `include` array (currently lines 15–22) extended
  with `"cypress/**/*.ts"` so Cypress types are picked up by the workspace
  type-check; if Cypress's own TS conflicts with the existing `module:
"ESNext"` config it instead ships under its own `apps/web/cypress/tsconfig.json`
  that extends the workspace one. The implementer chooses whichever yields a
  clean `yarn type-check`.

## Phase 0 — CI gate

- `.github/workflows/cypress.yml` — follows the pattern in
  `.github/workflows/ci.yml`:
  - `on: { push: { branches: [main] }, pull_request: { branches: [main] } }`.
  - `concurrency.group: cypress-${{ github.ref }}` with
    `cancel-in-progress: true`.
  - `runs-on: ubuntu-latest`.
  - Steps: `actions/checkout@v4` → `actions/setup-node@v4` with
    `node-version-file: .nvmrc` (Node 24, matching `ci.yml`) and `cache: yarn`
    → `yarn install --frozen-lockfile` → `yarn workspace @sorrel/frontend
build` → `yarn workspace @sorrel/frontend e2e --browser chrome` (the `e2e`
    script wraps `start-server-and-test`).
  - **Required check, not advisory.** A failing run blocks the PR. The branch
    protection rule itself is set in the repo admin UI by Akın; the workflow
    name `Cypress` is what gets added to the required-checks list.

## Phase 0 — Catalog tests (also lands here)

Organised under `apps/web/cypress/e2e/delivery-picker/`:

- `a11y.cy.ts` — C-01, C-03, C-04, C-07.
- `ux.cy.ts` — C-11, C-12, C-16, C-17, C-18, C-19, C-20, C-21, C-22.
- `correctness.cy.ts` — C-23 (smoke), C-24 (TZ matrix).

Each test reproduces the Phase 3 catalog row verbatim in its `it()` title and
inline comment, so a reviewer can match catalog ID → test 1:1.

## Phase 0+ — Funnel happy path

The Tier-2 "one Cypress happy path" lands in the same PR as the bootstrap so
the runner has a real end-to-end flow to gate on from day one.

File: `apps/web/cypress/e2e/funnel/happy-path.cy.ts`

Pre-conditions (in `beforeEach`):

- `cy.clearLocalStorage()` — defeats the spec-010 resume banner so the run
  always starts from CATS.
- `cy.clock(new Date("2026-06-12T09:00:00Z"))` — same fixed clock the
  delivery-picker specs use; the earliest deliverable becomes Mon 2026-06-15
  deterministically.
- Force PROFILE variant A (the control = pills branch). Mechanism: the
  implementer picks one of (a) a `cypress` query-param read by `useVariant`
  (`apps/web/app/[locale]/wizard/useVariant.ts`) gated by `NODE_ENV !==
"production"`, or (b) a `window.__sorrelVariant = "A"` hook the same hook
  honours. The spec does **not** override the PostHog flag in the SDK; the
  override lives entirely client-side so the test does not depend on a
  feature-flag network call. Variant B is **out of scope for the happy path**
  (see Out of scope) and is left for a follow-on spec.

Flow (one `it()`, named `"completes CATS → SUMMARY under variant A"`):

| #   | Action                                                                                         | Assertion                                                            |
| --- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | `cy.visit("/en/wizard/cats")`                                                                  | URL contains `/wizard/cats`; no `[role="alert"]` rendered            |
| 2   | Pick `2 cats` → click Continue                                                                 | URL contains `/wizard/profile`                                       |
| 3   | Type name `Whiskers`; pick the `Adult` age pill; pick the `Average` weight pill → Continue     | URL contains `/wizard/recipes`                                       |
| 4   | Pick the first recipe card → Continue                                                          | URL contains `/wizard/delivery`                                      |
| 5   | Click `Change` → grid cell for `2026-06-17` → Confirm → wait for picker close-chain → Continue | URL contains `/wizard/plan`                                          |
| 6   | Observe the optimistic price preview rendered (spec 013) → Continue                            | URL contains `/wizard/email`                                         |
| 7   | Type `test@example.com` → Continue (server action)                                             | URL contains `/wizard/summary`                                       |
| 8   | Read the SUMMARY copy                                                                          | `Whiskers`, the recipe label, `2026-06-17`, and the email all appear |

Typed-event assertions (same `it()`, after the final URL check):

The implementer exposes a read-only window hook
(`window.__sorrelAnalyticsQueue`) that surfaces the in-memory event queue from
`@sorrel/analytics`'s `memorySink`. The hook is guarded by `NODE_ENV !==
"production"` so it never reaches a live build. The test then asserts:

- Exactly one `funnel_step_viewed` per step (7 in total), each with the
  correct `step` prop from the `FunnelStep` enum in `packages/analytics`.
- Exactly one `step_completed` per step (7 in total). The `profile` row
  carries `variant: "A"`.
- Zero `field_error` events.
- Zero `funnel_abandoned` events.
- Zero `exit_intent_shown` events (the scripted run does not synthesise the
  desktop exit gesture).

Assertion shape (illustrative — the implementer matches actual enum values):

```ts
const completed = window.__sorrelAnalyticsQueue
  .filter((e) => e.name === "step_completed")
  .map((e) => e.props.step);
expect(completed).to.deep.equal([
  "cats",
  "profile",
  "recipes",
  "delivery",
  "plan",
  "email",
  "summary",
]);
```

The happy path is intentionally tight: one variant, one locale (`en`), one
viewport (`1280x800`), one branch. Variant B, the `de` locale, mobile, the
validation-error retry paths, abandonment, exit-intent, and the EMAIL
server-side validation failure are explicit out-of-scope follow-ons.

### Catalog rows reproduced verbatim from Phase 3

A11y in a real browser (Phase 3a — rows not riding 025):

| ID   | Title                                                      | Asserts                                                             | Catches                                |
| ---- | ---------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------- |
| C-01 | Tab focus-trap never escapes dialog                        | Tab × 20 → `document.activeElement` stays inside the dialog subtree | JS trap bypassed in real tab order     |
| C-03 | Arrow keys move real `document.activeElement`              | ArrowRight/Down updates focus to the expected cell                  | Roving-tabindex broken in real browser |
| C-04 | Exactly one `<button class="sdp-cell">` has `tabIndex===0` | snapshot the count at multiple points                               | `tabIndex` not driven by `isActive`    |
| C-07 | Backdrop click leaves no zombie node                       | `.sdp-modal` does not exist after close                             | Hidden-but-mounted regression          |

UX (Phase 3c — rows not riding 028):

| ID   | Title                                                | Asserts                                                                    | Catches                                                  |
| ---- | ---------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- |
| C-11 | Scrim is translucent                                 | computed `background-color` has alpha < 1                                  | Scrim rendered opaque                                    |
| C-12 | Body scroll locks while open                         | scrolling inside scrim does not move `documentElement.scrollTop`           | No `overflow:hidden` on body                             |
| C-16 | Enter animation plays for ≥ 160 ms                   | `transform` differs at 0 ms vs 90 ms                                       | Animation disabled / near-zero duration                  |
| C-17 | Exit animation plays for ≥ 160 ms before DOM removal | dialog present at 90 ms, gone by 400 ms                                    | Synchronous unmount on cancel                            |
| C-18 | Touch backdrop tap closes without committing         | `cy.trigger('touchstart'/'touchend')` on backdrop → `onConfirm` not called | `onClick` not firing on tap                              |
| C-19 | All targets ≥ 44 px at 375 px viewport               | every Change/Cancel/Confirm/cell has `clientHeight >= 44`                  | Narrow-width regression                                  |
| C-20 | Focus ring renders double-ring on focused cell       | computed `box-shadow` matches the two-ring spec                            | Ring lost / wrong colour                                 |
| C-21 | Focus ring absent on blocked cells (BONUS)           | focused blocked cell does not get the accent ring                          | Ring leaks onto blocked cells                            |
| C-22 | Modal does not clip on a 667 × 375 short viewport    | bottom edge ≤ `window.innerHeight`                                         | No `max-height` / `overflow-y` (currently unconstrained) |

Correctness in the live app (Phase 3d):

| ID   | Title                                                                                           | Asserts                             | Catches                                                         |
| ---- | ----------------------------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------- |
| C-23 | Smoke: open picker from `/wizard/delivery`, pick 17, summary updates                            | full step wiring                    | App-level drift between `DeliveryStep` and `DeliveryDatePicker` |
| C-24 | TZ matrix: `TZ=America/Los_Angeles` and `TZ=Asia/Tokyo` yield identical picker for same `today` | same earliest, same closed-card day | Re-introduction of local-time arithmetic                        |

### C-23 wiring reference

`apps/web/app/[locale]/wizard/steps/index.tsx` hosts `DeliveryStep` (lines
82–111). It reads `state.deliveryDate` from the `useFunnel()` provider and
dispatches `{ type: "SET_DELIVERY_DATE", date: iso }` from the picker's
`onConfirm`. The smoke navigates to `/{locale}/wizard/delivery` (the route is
`apps/web/app/[locale]/wizard/[step]/page.tsx`, which calls `stepFromSegment`
to resolve `"delivery"` → `DELIVERY` and renders `<StepScreen
step="DELIVERY" />`), opens the picker via the closed-card "Change" button,
arrow-keys / clicks to day 17 of the visible month, presses Confirm, and
asserts the closed card's day number reads `17`.

The selector for the day-17 cell is the picker's day button by its
`aria-label` (already localised through `tp("…")` in `DeliveryStep`), not by
text content, so the smoke is i18n-safe.

# Contract impact

None on `schema.graphql`. None on `packages/domain`. None on
`packages/analytics`. Adds three dev-dependencies and one CI workflow.

# Out of scope

- The catalog rows that ride **approved specs 025, 028, 029**. Those land
  alongside each spec's implementation, not here:
  - **025** rides: C-02 (background `inert`), C-05 (ESC return-focus to
    trigger), C-06 (Confirm return-focus to trigger).
  - **028** rides: C-13 (hover feedback), C-14 (press feedback), C-15
    (blocked cell does NOT hover).
  - **029** rides: C-08 (backdrop fade under reduced motion), C-09 (modal
    does not stick open under reduced motion), C-10 (modal `animation-name`
    swap).
- Visual-regression / Percy / Chromatic. Pixel diffs are explicitly excluded;
  this spec gates on computed-style assertions only.
- Cross-browser matrix beyond Chrome. Firefox is **optional and not gated** —
  the workflow runs Chrome only. A local `--browser firefox` invocation is
  documented in this spec's body but not enforced.
- Mobile-device emulation beyond viewport sizes. No `cy.viewport("iphone-x")`
  device presets; the spec gates only on the two named configurations
  (`375x667`, `1280x800`).
- PROFILE variant B (autocomplete branch). The happy path pins variant A;
  variant B's flow lands in a follow-on spec so the smoke stays single-shape.
- The `de` locale, the mobile viewport (`375x667`), validation-error retry
  paths, abandonment, exit-intent, and the EMAIL server-side validation
  failure path. Each is a deliberate follow-on once the happy path is green.
- Backend e2e against `services/api`. The happy path trusts the client-side
  dispatch path inside `useFunnel()`; it does not assert any GraphQL mutation
  fires against a live server.
- Custom Cypress reporters / Dashboard recording / parallelisation.

# Acceptance criteria

- [ ] `yarn type-check` green (0 errors / warnings) — Cypress types are
      resolved either through `apps/web/tsconfig.json` `include` or a dedicated
      `apps/web/cypress/tsconfig.json`.
- [ ] `yarn lint` green (0 errors / warnings) — `eslint` ignores or covers
      `apps/web/cypress/**` per the existing `eslint-config-next` setup.
- [ ] `yarn workspace @sorrel/frontend cypress:run` passes on Chrome locally
      with the dev server already running.
- [ ] `yarn workspace @sorrel/frontend e2e` passes on Chrome locally without
      a pre-existing dev server (the `start-server-and-test` wrap is what proves
      this).
- [ ] The new CI workflow `.github/workflows/cypress.yml` runs on every PR.
- [ ] The workflow is a **required** check (the workflow exists; whether
      branch protection enforces it is configured by Akın in the repo admin UI).
- [ ] C-23 smoke fails loudly if `DeliveryStep`'s `onConfirm` →
      `SET_DELIVERY_DATE` dispatch wiring drifts (verified by temporarily
      commenting the dispatch in a local branch — the smoke must red).
- [ ] The 14 catalog rows in scope (C-01, C-03, C-04, C-07, C-11, C-12,
      C-16, C-17, C-18, C-19, C-20, C-21, C-22, C-23, C-24) all land green on
      the first CI run.
- [ ] The funnel happy-path test
      (`apps/web/cypress/e2e/funnel/happy-path.cy.ts`) walks CATS → PROFILE →
      RECIPES → DELIVERY → PLAN → EMAIL → SUMMARY under variant A and lands
      SUMMARY with the expected `name`, recipe, ISO date, and email rendered.
- [ ] The happy path asserts the `step_completed` queue equals the seven step
      keys in order, carries `variant: "A"` on the `profile` row, and asserts
      zero `field_error` / `funnel_abandoned` / `exit_intent_shown` events.
- [ ] The variant-A override mechanism (the `window.__sorrelVariant` hook or
      the `?cy_variant=A` query-param the implementer picks) is gated by
      `NODE_ENV !== "production"` so it cannot reach a live build. A one-line
      acceptance test in the same spec confirms the override is ignored under
      a `NODE_ENV === "production"` shim.
- [ ] The `window.__sorrelAnalyticsQueue` hook is gated by `NODE_ENV !==
"production"` and is `undefined` in a production build (verified by the
      same one-line shim test).
- [ ] No commits in the implementation PR touch `packages/ui/src/**`,
      `packages/domain/src/**`, or `schema.graphql` — the scope is e2e infra
      only. Note: the variant-override + analytics-queue hooks land inside
      `apps/web/**` (the `useVariant` hook and the funnel provider), not
      inside `packages/ui` or `packages/domain`.
- [ ] The `cy.setReducedMotion()` custom command is declared but **not
      consumed** by any spec in this PR; it exists for the 029 rows to consume
      later.
- [ ] CI workflow follows the existing `ci.yml` pattern: Node 24 via
      `node-version-file: .nvmrc`, yarn cache via `cache: yarn`, frozen-lockfile
      install, concurrency group with cancel-in-progress.
- [ ] No new entries in `services/api/**` or `packages/domain/**` —
      enforced by the `no-invention` and `source-of-truth` rules.

# Analytics

The happy path is the first end-to-end assertion that the typed funnel events
fire correctly across the whole flow, but it does **not** change the contract
defined by spec 009 — it asserts the existing emit sites do what they already
claim to do.

- Per-step expectations: `funnel_step_viewed` and `step_completed` each fire
  exactly once per step for the seven steps (`cats`, `profile`, `recipes`,
  `delivery`, `plan`, `email`, `summary`). Step keys match the `FunnelStep`
  enum in `packages/analytics`.
- Variant prop: the `step_completed` event for the `profile` step carries
  `variant: "A"` (the control branch), proving the spec-022 instrumentation
  threaded variant assignment through the typed contract.
- Negative assertions: zero `field_error`, zero `funnel_abandoned`, zero
  `exit_intent_shown` events on the happy path. Each is its own deliberate
  branch covered by follow-on specs.
- Sink target: tests read the in-memory queue from the `memorySink`
  (`packages/analytics`) via a `NODE_ENV !== "production"` window hook.
  The happy path does **not** call into PostHog or Mixpanel; the sink seam
  itself is the existing one — no new sink, no new transport.
- The C-23 picker smoke also verifies the closed-card UI updates from the
  funnel state; the corresponding picker analytics are already pinned by
  spec 009 and its consumers in the wizard.
