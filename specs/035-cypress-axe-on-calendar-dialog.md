---
spec: 035
title: Cypress-axe real-browser rules on the delivery calendar dialog
approved: yes
tier: 3
owner: apps/web
---

# Problem / gap

The Tier-3 closer "axe checks in CI" (README.md L188-189) currently scores as
partial. The state today:

- `apps/web/devDependencies` already pins `cypress-axe@^1.6.0` and
  `axe-core@^4.10.0` (installed under spec 032).
- `apps/web/cypress/support/e2e.ts` L7 side-effect-imports `cypress-axe`, which
  registers `cy.injectAxe()` and `cy.checkA11y()` on the Cypress chainable.
- `apps/web/cypress/support/commands.ts` L12-19 declares the chainable type stub
  (the `openDeliveryPicker` / `setReducedMotion` block; `injectAxe` is picked up
  from `cypress-axe`'s own types) — the runner is wired.
- **No test in `apps/web/cypress/e2e/**`actually calls`cy.injectAxe()`or`cy.checkA11y()`.\*\* The installed dependency is dead weight.

`jest-axe` runs in `packages/ui` against jsdom — see
`DeliveryDatePicker.test.tsx` L333-339 ("closed state has no a11y violations")
and the open-dialog twin a few lines below. jsdom does not compute box-shadow,
does not honour real focus outlines, does not apply OS-level
`prefers-reduced-motion`, and does not implement `inert` semantics on a
background subtree. Real-browser-only violations (the spec-025 R4 double-ring
on the focused gridcell, the `inert` masking of the page behind the dialog,
real computed contrast on `--brand-primary` on the day labels) are invisible
to the current pack.

No existing approved spec covers a real-browser axe pass:

- **024** introduced `jest-axe` (jsdom).
- **025** hardened a11y but stayed jsdom-side.
- **031 / 034** were integration + SSR fixes, not a11y rules.
- **032** installed `cypress-axe` as the runner gate; this spec gives that
  runner real work to do.

The DeliveryDatePicker is the right surface to start with: it is SSR-clean as
of spec 034, has stable selectors (`.sdp-modal`, `.sdp-backdrop`, `.sdp-cell`),
and the `jest-axe` pack already names the rule set worth mirroring.

# Scope

Tests-only. Three additions to one file. No production code changes.

## 1. New `describe` block in `apps/web/cypress/e2e/delivery-picker/a11y.cy.ts`

Insert a `describe("real-browser axe (spec 035)")` block after the existing
C-07 case (current file ends at L62 with the `realPressOrTab` shim and the
`Cypress.Commands.add` block; the new describe lands between the last `it` of
the existing suite and the shim — i.e. after L61, before L64).

Three cases, each MIRRORING (not duplicating) the `jest-axe` pack at
`packages/ui/src/DeliveryDatePicker.test.tsx` L333+:

- **A-01 — closed-card axe pass.** Visit `/en/wizard/delivery`, call
  `cy.injectAxe()`, then `cy.checkA11y(null, axeConfig)` scoped to the page.
  Mirror of the jest-axe "closed state has no a11y violations" case (L334-338),
  but in a real browser so computed contrast on the closed card's day-number
  label and the surrounding Change button are honoured at the actual rendered
  colours.
- **A-02 — open-dialog axe pass.** `cy.openDeliveryPicker()`,
  `cy.injectAxe()`, `cy.checkA11y('[role="dialog"]', axeConfig)`. Mirror of
  the jest-axe "open dialog has no a11y violations" case, but with real focus
  outlines and real `inert` semantics on the background subtree (which jsdom
  does NOT honour).
- **A-03 — focused-cell axe pass.** Open the picker, focus
  `[role="gridcell"][aria-selected="true"]`, `cy.injectAxe()`,
  `cy.checkA11y('[role="gridcell"][aria-selected="true"]', axeConfig)`.
  Real-browser-only: it asserts the focused-cell's double-ring box-shadow
  (spec 025 R4) does not produce a colour-contrast or visual-target violation.
  No jest-axe equivalent exists; jsdom can't compute box-shadow.

## 2. Shared `axeConfig` object at the top of the new describe block

```ts
const axeConfig = {
  rules: {
    // The picker is a fragment; landmark/heading-level rules are out of scope
    // here because the host page provides the main landmark. Add more skips
    // ONLY with a comment naming the spec and the reason.
    region: { enabled: false },
    "page-has-heading-one": { enabled: false },
  },
};
```

Every other axe rule runs at its default severity. No `wcag2a` / `wcag2aa`
`runOnly` filter — let axe run the full default ruleset (WCAG 2.1 A + AA +
best-practice rules at axe-core defaults). Each skip must carry a one-line
comment naming this spec; this mirrors the project's wider no-band-aid rule.

## 3. No new custom command

`cy.injectAxe()` from the side-effect import in
`apps/web/cypress/support/e2e.ts` L7 is enough. Do NOT introduce
`cy.checkA11yDefault()` or any other wrapper. Reviewers should see the
assertion shape (and the scope selector) at every call site.

## Files touched

- `apps/web/cypress/e2e/delivery-picker/a11y.cy.ts` — additions only.

## Files NOT touched

- `packages/ui/**` — no production change.
- `apps/web/app/**` — no production change.
- `apps/web/cypress/support/commands.ts` — no new commands.
- `apps/web/cypress/support/e2e.ts` — already imports `cypress-axe`.
- `apps/web/package.json` — `cypress-axe` and `axe-core` already present.
- `services/api/**`, `schema.graphql`, `packages/domain/**`,
  `packages/analytics/**` — irrelevant.

# Contract impact

None. No new exports, no new dependencies (`cypress-axe` and `axe-core` are
already devDeps in `apps/web/package.json` L44, L46), no schema change, no
domain change, no codegen consequence. The three rules-of-engagement (skipped
axe rules + axe config shape + call-site visibility) are documented in this
spec and as inline comments at the test file; they are NOT a separate runtime
contract.

# Out of scope

- **CMS bloks** (landing page / recipes). Extending axe to the Storyblok
  surface is a separate spec.
- **Wizard steps other than DELIVERY.** CATS / PROFILE / RECIPES / PLAN /
  EMAIL / SUMMARY each have different a11y concerns; each warrants its own
  spec when the team is ready.
- **`cy.checkA11y` with custom violation callbacks** (e.g. printing the
  violation table to the run log). Default reporter behaviour is enough for
  the first pass.
- **Visual-regression on focus rings.** This spec asserts axe rules pass, not
  pixel diffs.
- **WCAG 2.2 AAA filter.** Default ruleset only.
- **The `allowCypressEnv` Cypress 15 deprecation** flagged in the roadmap.
  Separate concern, separate spec.

# Acceptance criteria

- [ ] `yarn type-check && yarn lint && yarn format:check` — all green.
- [ ] `yarn workspace @sorrel/ui test` — unchanged (43 passing). No
      jest-axe case touched.
- [ ] `yarn workspace @sorrel/frontend cypress run` — full suite is
      **22 / 0 / 0** (passing / failing / pending): 19 existing + 3 new
      (A-01 / A-02 / A-03), wall-clock under 35 s on CI (current run is
      ~17 s).
- [ ] Each of A-01 / A-02 / A-03 calls `cy.injectAxe()` AND
      `cy.checkA11y(...)` explicitly. A reviewer can see at the test file
      what rules are scoped to which subtree.
- [ ] The two skipped axe rules (`region`, `page-has-heading-one`) appear in
      the shared `axeConfig` object with a one-line comment each naming
      spec 035. Any future skip needs a comment of the same shape.
- [ ] No `eslint-disable`, `@ts-ignore`, or `@ts-expect-error` added.
- [ ] No production code changed (`packages/ui` / `apps/web/app` /
      `services/api` / `schema.graphql` / `packages/domain` untouched).
- [ ] Commit subject includes the `Spec: 035` trailer.

# Analytics

None. This is an e2e-coverage extension; no new typed events fire, and the
spec-009 contract (`funnel_step_viewed`, `step_completed`, `field_error`,
`funnel_abandoned`) is unchanged.
