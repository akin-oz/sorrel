---
spec: 034
title: Fix the picker's SSR/CSR `today` drift and short-viewport modal clip; drop the Cypress hydration suppression
status: proposed
approved: yes
tier: 1 # centerpiece protection — both bugs live inside the Tier-1 picker
owner: packages/ui (production), apps/web (Cypress)
---

# Problem / gap

Recent Cypress runs surfaced two real picker bugs that the existing approved
spec set (001 / 024 / 025 / 028 / 029 / 030 / 031 / 032) does not cover.

## 1. SSR/CSR drift on the picker's default `today`

`packages/ui/src/DeliveryDatePicker.tsx` line 191 resolves the `today` default
during render:

```ts
const today = todayProp ?? toIso(new Date());
```

When the host (`apps/web/app/[locale]/wizard/steps/index.tsx`, lines 101-107)
does not pass `today` (it currently does not), the server's render evaluates
`toIso(new Date())` at request time and the client's first render evaluates it
at hydration time. Across a UTC-day boundary — or simply across SSR build time
vs client run time in dev — those ISO strings disagree, so:

- The first client paint of the closed-card `dayNumber` (line 427:
  `parseIso(committed).getUTCDate()`) is computed from `committed` seeded off
  `earliest`, which is itself seeded off `today`. A different `today` ⇒ a
  different `earliest` ⇒ a different `committed` ⇒ a different `dayNumber`,
  the `ARIA` label, and the formatted weekday string in `ClosedCard`.
- React 19 raises a hydration-mismatch error (Minified React error #418 /
  #423 / #425 depending on path) and recovers on the client. The recovered
  output is correct, but every Cypress run logs the warning.
- We currently _suppress_ those errors in
  `apps/web/cypress/support/e2e.ts` lines 17-30 (`Hydration failed`,
  `hydrating`, `There was an error while hydrating`, Minified React error #418
  / #423 / #425). That suppression is a band-aid per the project's
  no-suppression / fix-root-cause rule and additionally masks _future_
  hydration drift in unrelated code paths.

No approved spec covers an SSR-safe default for `today`. Spec 001 sets the
contract (`today` is optional, defaults to "the current date") but does not
specify the SSR-safety mechanism.

## 2. Modal clips on short viewports

The modal `<div className="sdp-modal">` container in
`packages/ui/src/DeliveryDatePicker.tsx` lines 601-625 sets `position:
absolute`, `top: "50%"`, `transform: "translateY(-50%)"`, `maxWidth: 420`, and
`marginInline: "auto"`, but defines **no `max-height` or `overflow-y`** rules.
At a 667 × 375 (landscape phone / soft-keyboard-up) viewport the modal
renders ~401 px tall and overflows the 375 px viewport — the Confirm/Cancel
button row drops below the visible area with no scroll path to it.

The UX-juror review and the spec-032 Cypress catalog row **C-22** both
flagged this. C-22 currently lives as `it.skip(...)` at
`apps/web/cypress/e2e/delivery-picker/ux.cy.ts` lines 118-127 with a TODO
naming this exact spec (see the comment at lines 111-117). Skipping keeps the
row visible in Cypress' `pending` count but the assertion does not actually
run.

No approved spec covers the short-viewport scroll contract for the modal.
Spec 025 hardens dialog a11y (R2 inertness, R3 live-region, R4
`role=gridcell` on the focused button), spec 028 covers hover/press, spec 029
covers reduced motion, spec 031 covers integration polish — none of them
introduce the `max-height` rule the modal needs.

# Scope

The exact files, components, and test files this spec touches. Named.

## Picker production change — `packages/ui/src/DeliveryDatePicker.tsx`

1. **SSR-safe `today` default.** Replace the inline
   `const today = todayProp ?? toIso(new Date())` at line 191 with a
   `useState` initializer pattern so the client-only `new Date()` call is
   computed _once_ during initial state setup and is stable across renders.
   Concrete recommendation:

   - Introduce `const [clientToday] = useState<IsoDate | null>(() => null);`
     and a `useEffect` that sets it on mount; OR (preferred) compute the
     fallback in a single `useState` initializer:
     `const [fallbackToday] = useState<IsoDate>(() => toIso(new Date()));`
     and resolve `const today = todayProp ?? fallbackToday;`. The
     `useState`-initializer variant runs once during the first client render
     after hydration, so the _server_ render and the _first_ client render
     both see the same value the implementation chooses for SSR — which must
     be a stable seed (see the next bullet).
   - For the SSR path, the closed-card must be derived from a stable seed
     that does not depend on `new Date()`. Two options, the human must pick
     one in review:
     - **Option A — empty closed card on the server.** Return `null` (or a
       skeleton placeholder of identical box dimensions) when `todayProp` is
       absent and we are on the server / first client render, then swap to
       the real picker after mount. Pros: provably no drift. Cons: the
       closed card flashes once on the first paint.
     - **Option B — seed from a host-supplied or build-time constant.** Keep
       the `useState` initializer fallback but require the host to pass
       `today` whenever it cares about a stable SSR value. Document the
       contract in the JSDoc above `todayProp`. The wizard host in
       `apps/web/app/[locale]/wizard/steps/index.tsx` lines 101-107 is the
       only `apps/web` consumer; threading a (still-optional) `today` from
       the server component into `<DeliveryDatePicker>` keeps the prop
       optional for `packages/ui` consumers but eliminates the drift at the
       Tier-1 funnel call site.

   The human must choose A or B during approval. The author's
   recommendation is **B** because it is additive, keeps the picker's
   contract identical, and matches how `value` / `defaultValue` already flow
   from the host. Either way, the picker keeps `today` optional.

2. **Short-viewport scroll contract.** Add to the `.sdp-modal` inline style
   block at lines 610-625:

   ```ts
   maxHeight: "calc(100dvh - 32px)",
   overflowY: "auto",
   ```

   The 32 px gutter matches the existing `left: 16, right: 16` insets. Use
   `dvh` (dynamic viewport height) so the rule plays nice with mobile URL
   bars and soft-keyboard appearance. Inline-style key is `maxHeight` /
   `overflowY` (camelCase) per the rest of the file.

## Cypress de-suppression — `apps/web/cypress/support/e2e.ts`

3. **Remove the hydration suppression block.** Delete the six-clause `if`
   inside `Cypress.on("uncaught:exception", (err) => { … })` at lines 19-28
   (the `Hydration failed` / `hydrating` / `There was an error while
hydrating` / `Minified React error #418` / `#423` / `#425` clauses). Keep
   the handler scaffold itself — the signature and `return undefined` —
   so future, justified suppressions have somewhere to live with a comment
   explaining each one. The comment above the handler (lines 11-16) must be
   rewritten to say "no suppressions; spec 034 removed the hydration band-aid
   after fixing the picker's SSR/CSR drift at the source."

## Cypress un-skip — `apps/web/cypress/e2e/delivery-picker/ux.cy.ts`

4. **Un-skip C-22.** Replace `it.skip("C-22 — modal does not clip on a
667 × 375 short viewport (picker bug, needs spec)", () => { … })` at
   lines 118-127 with `it("C-22 — modal does not clip on a 667 × 375 short
viewport", () => { … })`. The block comment at lines 111-117 must be
   replaced with a one-line marker noting spec 034 introduced the
   `max-height: calc(100dvh - 32px); overflow-y: auto` rule that makes the
   assertion pass. The assertion body — `rect.bottom <= win.innerHeight` —
   does not change; it now passes because the modal scrolls inside its
   own container instead of overflowing.

## Jest coverage — `packages/ui/src/DeliveryDatePicker.test.tsx`

5. **One new `describe` block** documenting the SSR-safety contract. Two
   cases inside it:

   - "renders the closed card stably without `today` across re-renders" —
     `render(<DeliveryDatePicker />)`, capture the closed-card
     `dayNumber`, then `rerender` and assert the same `dayNumber` is in the
     DOM. This locks the `useState`-initializer fix: the fallback `today`
     must not be recomputed on every render.
   - "matches the same closed card when `today` is passed explicitly" —
     render twice in parallel (one with `today={TODAY}`, one without where
     `Date.now()` is mocked to the same instant) and assert both produce
     the same closed-card `dayNumber`. This is the closest in-process
     analogue to an SSR/CSR match; a true SSR test would require
     `react-dom/server`, which is out of scope (no new test deps).

   No existing test in the file covers the no-`today` path (every
   `renderPicker` helper at line 28 passes `today={TODAY}`), so this is
   genuinely additive — not a duplicate of spec 024 / 025 / 029 / 031
   coverage.

# Contract impact

None.

- `schema.graphql`: untouched.
- `packages/domain`: untouched.
- `packages/ui` public surface — `DeliveryDatePicker` props,
  `DeliveryLabels`, `DeliveryTheme`, exports from `packages/ui/src/index.ts`:
  **untouched**. `today` stays optional. No new props. Closed-card
  `dayNumber` derivation (`parseIso(committed).getUTCDate()`, line 427) is
  unchanged.
- `apps/web` public surface: untouched. If the human picks Option B above,
  the wizard's `DeliveryStep` thread of `today` is an _additive_ prop pass
  — still optional, no host signature change.
- **No new npm dependencies.** No new exports. No new tokens.

# Out of scope

- **Visual-design tweaks beyond the `max-height` rule.** Tokens stay as-is.
  No padding/spacing edits inside the modal beyond what `overflow-y: auto`
  necessarily implies (a thin scrollbar on overflow).
- **The reduced-motion safety-net timer.** Spec 029 territory; the 320 ms
  `closeTimer` at `DeliveryDatePicker.tsx` line 276 is not touched.
- **Catalog rows that ride approved specs 025 / 028 / 029.** This spec
  un-skips _only_ C-22. All other `ux.cy.ts`, `a11y.cy.ts`, and
  `correctness.cy.ts` rows are unchanged.
- **Branding `IsoDate` as a nominal type.** Noted in the spec-030 audit as
  a separate code-quality follow-on; not in this spec.
- **Server-component refactors of `DeliveryStep`.** The picker is a
  `"use client"` leaf; its host (`apps/web/app/[locale]/wizard/steps/
index.tsx`) stays as-is beyond the optional `today` thread (Option B).
- **A real SSR Jest harness.** No `react-dom/server` integration test. The
  RTL re-render assertion is the in-process proxy.
- **Future justified suppressions in `cypress/support/e2e.ts`.** This spec
  removes the hydration band-aid; if a future spec needs a different
  suppression, that spec authors it. The handler scaffold remains so a
  future spec has a single, reviewable place to add one.

# Acceptance criteria

- [ ] `yarn type-check` green (0 errors / 0 warnings).
- [ ] `yarn lint` green.
- [ ] `yarn format:check` green.
- [ ] `yarn workspace @sorrel/ui test` — the new RTL `describe` block
      passes; the existing 41 cases in `DeliveryDatePicker.test.tsx`
      continue to pass unchanged.
- [ ] `yarn workspace @sorrel/frontend cypress run` — full suite is
      19 / 0 / 0 (passing / failing / pending). C-22 is no longer
      `it.skip`; nothing else regresses. Confirm by reading the Cypress
      summary at the end of the run.
- [ ] `apps/web/cypress/support/e2e.ts` no longer suppresses any
      hydration message. Grep `Hydration failed` / `hydrating` /
      `Minified React error` in the file ⇒ zero hits. The full Cypress
      run completes WITHOUT logging "Hydration failed" once in any test's
      console output.
- [ ] The modal at 667 × 375 viewport scrolls inside its own container
      (DevTools manual check): the Confirm button is reachable by either
      tabbing or scrolling within the modal. `rect.bottom <= innerHeight`
      asserted in C-22.
- [ ] The closed card with no `today` prop renders the same `dayNumber`
      on first render and on a follow-up `rerender()` in the new Jest
      case (this is the SSR-safety contract in-process).
- [ ] No `eslint-disable` / `@ts-ignore` / `@ts-expect-error` added
      anywhere (per the memory-pinned root-cause rule).
- [ ] No changes to `apps/web/app/[locale]/wizard/steps/*` or
      `DeliveryStep`'s call site **beyond** what's needed to thread the
      (still-optional) `today` prop if the human picks Option B during
      approval.
- [ ] Commit subject includes the `Spec: 034` trailer.

# Analytics

None.

This is a picker-internals + e2e-suite hardening pass. No new typed events.
No changes to the spec-009 funnel event contract. No
`funnel_step_viewed` / `step_completed` / `field_error` /
`funnel_abandoned` props change. The picker remains a `packages/ui`
primitive; analytics for delivery-day selection is owned by its host
(spec 010 / spec 009), which is unaffected.
