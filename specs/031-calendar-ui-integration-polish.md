---
spec: 031
title: Extend the DeliveryDatePicker Jest + RTL pack with 22 net-new UI-integration invariants (correctness, focus-wrap, UX state machine, theming parity)
status: proposed
approved: yes
tier: 1 # centerpiece protection on the Tier-1 Delivery Date Picker
owner: packages/ui
---

> Roadmap note: this is the **UI-integration extension** of the centerpiece
> test-coverage audit. Spec 024 already landed the Jest + RTL + jest-axe
> scaffold and pinned 14 cases (close-chain, blocked NO-OP, return-focus, plus
> the two domain edge cases). This spec adds the **22 net-new UI cases** a
> four-lens follow-on review (correctness, a11y, UX, code-quality) surfaced as
> not duplicated by 024. The a11y-semantics cases (U-08…U-15) ride **spec 025**,
> the reduced-motion idempotency case (U-23) rides **spec 029**, and the
> hover/press cases ride **spec 028** — none of those IDs are in this spec.

# Problem / gap

Spec 024 (`specs/024-calendar-ui-interaction-tests.md`, approved) locked the
five highest-risk DeliveryDatePicker behaviours: the `closing → animationend →
unmount` close chain, Confirm-vs-discard semantics, blocked-cell NO-OP on click
and keyboard, the closed-card re-render on commit change, and return-focus to
the Change trigger. It also wired the Jest + Testing Library + jest-axe runner
into `packages/ui` for the first time.

The four-lens follow-on review (correctness / a11y / UX / code-quality) that
produced the catalog identified **22 additional UI-integration invariants** that
024 does **not** cover and that no other approved spec covers either:

- **Correctness (U-01…U-07):** the open-view-month derivation (from
  `committed`, not `today`; see `packages/ui/src/DeliveryDatePicker.tsx:220-223`),
  single-select after a click, the closed-card label/day swap, the genuine
  absence of the modal from the DOM after close, the controlled `value`
  contract (`packages/ui/src/DeliveryDatePicker.tsx:191-193`), and the
  `defaultValue` blocked-date contract. None of these are pinned today: a
  refactor that, say, switched `viewYear/viewMonth` to read `today` instead of
  `committed`, or that let internal state shadow the controlled `value` prop,
  would ship green.
- **Focus wrap (U-16…U-19):** Tab forward and Shift+Tab back must wrap inside
  `handleDialogKeyDown`
  (`packages/ui/src/DeliveryDatePicker.tsx:287-305`); ESC must call
  `onOpenChange(false)` as part of the `requestClose(false)` chain
  (`packages/ui/src/DeliveryDatePicker.tsx:247-259`); and `moveFocus` must treat
  Home/End as row-edge moves bounded by the visible week, not month-edge moves.
- **UX state machine (U-20…U-22, U-24…U-26):** the `data-state` attribute must
  transition `"open" → "closing" → (unmount)` in order; backdrop and modal must
  both carry `data-state="closing"` for the same frame; the 320 ms safety-net
  timer inside `requestClose`
  (`packages/ui/src/DeliveryDatePicker.tsx:258`) must drive unmount even when
  `animationend` never fires; Confirm must fire `onConfirm` with the **draft**,
  not the committed value; the closed-card `dayNumber` and the
  `isEarliest ? earliestDelivery : deliveryDate` caption must swap correctly
  on commit.
- **Theming code-quality (U-27…U-29):** both `sorrelTheme` and `brambleTheme`
  (`packages/ui/src/theme/tokens.ts:47-89`) must render the same DOM and ARIA
  structure and the same blocked-cell set; and the `DeliveryTheme` interface
  (`packages/ui/src/theme/tokens.ts:8-38`) must be structurally satisfied by
  both objects without any `as DeliveryTheme` widening — caught by a TS
  compile-check file, not a runtime test.

The Tier-1 centerpiece deserves a net wide enough to catch all of these.
Spec 024 deliberately stopped at five cases to keep the scaffold-introducing PR
small; this spec extends that pack on top of the runner 024 stood up.

# Scope

Test-only extension of `packages/ui/src/DeliveryDatePicker.test.tsx`, plus one
new TS compile-check file under `packages/ui/src/theme/__type-checks__/`.

**No production source change** in `packages/ui/src/DeliveryDatePicker.tsx`,
`packages/ui/src/theme/{tokens,styles}.ts`, or
`packages/domain/src/delivery/calendar.ts`. **No new public exports**, no
`index.ts` edits, no `schema.graphql` edits, no `packages/domain` edits, no
`apps/web` edits.

## 1 — Extend `packages/ui/src/DeliveryDatePicker.test.tsx`

The 22 cases land alongside the existing 14 cases in the same file. They reuse
the fixed clock (`TODAY = "2026-06-12"`), the `renderPicker(overrides)` helper,
the `openDialog(user)` helper, and the `finishCloseAnimation(dialog)` helper
that spec 024 introduced (verified at
`packages/ui/src/DeliveryDatePicker.test.tsx:1-39`). U-22 additionally uses
`jest.useFakeTimers({ doNotFake: ["nextTick"] })` (the same pattern spec 024's
§2 paragraph called out for the 320 ms safety-net timer in `requestClose`);
all other cases keep real timers.

The 22 cases are reproduced **verbatim** from the catalog's Phase 2a / 2b
(`new` only) / 2c (`new` only) / 2d tables. Each row's `Spec` column reads
`new` in the catalog and is therefore in-scope here; rows marked `025`, `028`,
or `029` are out of scope (see **Out of scope**).

### 1a — Correctness (Phase 2a, U-01…U-07)

| ID   | Title                                                               | Asserts                                                                       | Catches                                                     | Spec |
| ---- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------- | ---- |
| U-01 | Opens on EARLIEST month, not today's month                          | `today="2026-06-29"` → grid header reads JULY 2026                            | UI computing view month from `today` instead of `committed` | new  |
| U-02 | Re-opening after confirm shows new committed month                  | Confirm 2026-07-02, re-open, header is July                                   | Stale `viewYear/viewMonth` memo                             | new  |
| U-03 | Single-select invariant on click                                    | After picking a new deliverable cell, exactly one `aria-selected="true"` cell | Set-based / additive draft                                  | new  |
| U-04 | Caption flips back to "Earliest delivery" on re-confirm of earliest | label swap after navigating away then back                                    | `isEarliest` stale-state read                               | new  |
| U-05 | Modal genuinely absent from DOM after close                         | `container.querySelectorAll(".sdp-modal,.sdp-backdrop").length===0`           | Regression to `display:none`/`opacity:0` mounted            | new  |
| U-06 | Controlled `value` is never shadowed                                | render with `value=`, confirm, closed card stays on parent value              | Internal state shadowing the prop                           | new  |
| U-07 | `defaultValue` contract                                             | document + lock chosen behaviour for blocked default                          | Silent acceptance of blocked initial commit                 | new  |

Notes (binding on the implementer, not on the reviewer):

- **U-01** uses `today="2026-06-29"` (a Monday) with default `leadDays`. The
  earliest deliverable falls in July 2026; the test reads the dialog's
  visible month/year heading (the `monthId`-labelled node in the
  `role="grid"` subtree) and asserts it reads the July label, not the June
  label.
- **U-02** drives the flow through the picker: open, navigate to a July day,
  Confirm, await close chain via `finishCloseAnimation`, re-open, assert the
  heading still reads July.
- **U-03** asserts the count of `[role="gridcell"][aria-selected="true"]`
  (or, equivalently, the `<button>` children carrying `aria-selected="true"`
  once spec 025 lands) is exactly 1 after a click. Pre-025, the assertion
  targets the same attribute on the gridcell.
- **U-04** drives the picker to confirm a later day, re-opens, navigates back
  to the earliest day, Confirms, asserts the closed-card caption text equals
  `DEFAULT_DELIVERY_LABELS.earliestDelivery` again.
- **U-05** after Confirm + `finishCloseAnimation`, asserts
  `container.querySelectorAll(".sdp-modal, .sdp-backdrop").length === 0`.
  This complements 024's `queryByRole("dialog")` assertion by also catching a
  hidden-but-mounted backdrop.
- **U-06** renders with `value="2026-06-15"` (earliest) and a no-op
  `onConfirm` (the parent ignores the callback). After picking a later day
  and Confirming, the closed-card text still reads `15`. A second assertion
  re-renders with `value="2026-06-17"` and confirms the closed-card text
  reads `17` immediately, without any user interaction.
- **U-07** is the "document + lock chosen behaviour" case. The current source
  reads
  `useState<IsoDate>(defaultValue ?? earliest)`
  (`packages/ui/src/DeliveryDatePicker.tsx:192`) — i.e. `defaultValue` is
  accepted **as-is**, including when the date is blocked. The test renders
  the picker with `defaultValue="2026-06-19"` (Friday, blocked weekday) and
  asserts the closed-card `dayNumber` reads `19` and the caption reads
  `deliveryDate` (not `earliestDelivery`). This **pins the current
  behaviour**; the test header comment must call out that this is the
  documented contract and that any future change (e.g. clamping a blocked
  `defaultValue` up to `earliest`) requires a contract-change spec. See
  **Decisions for the reviewer** below for whether the reviewer would
  rather change the contract instead of pinning it.

### 1b — Focus wrap and ESC threading (Phase 2b, only the `new` rows: U-16, U-17, U-18, U-19)

| ID   | Title                                    | Asserts                                    | Catches                                            | Spec |
| ---- | ---------------------------------------- | ------------------------------------------ | -------------------------------------------------- | ---- |
| U-16 | Tab forward wraps last → first           | from Confirm, Tab lands on first focusable | `getFocusable` order broken                        | new  |
| U-17 | Shift+Tab wraps first → last             | from first focusable, lands on Confirm     | wrap branch broken                                 | new  |
| U-18 | ESC sequence calls `onOpenChange(false)` | strengthens existing ESC test              | `onOpenChange` not threaded through `requestClose` | new  |
| U-19 | Home/End row-edge in `moveFocus`         | from mid-week, Home→Mon iso, End→Sun iso   | `moveFocus` row-edge regression                    | new  |

Notes:

- **U-16/U-17** pin the wrap branches inside `handleDialogKeyDown`
  (`packages/ui/src/DeliveryDatePicker.tsx:298-304`). U-16 focuses the
  Confirm button (the last focusable in the dialog under the current source),
  presses `Tab`, asserts `document.activeElement` is the first focusable
  returned by `getFocusable(dialogRef.current)`. U-17 mirrors it: focuses the
  first focusable, presses `Shift+Tab`, asserts focus is on the Confirm
  button.
- **U-18** strengthens 024's ESC test by asserting `onOpenChange` is called
  exactly once with `false` as part of the ESC → `requestClose(false)` chain
  (`packages/ui/src/DeliveryDatePicker.tsx:256`). Spec 024's ESC test does
  not pass an `onOpenChange` spy.
- **U-19** is a UI-level pin on `moveFocus`. The domain test pack already
  covers most of the move-focus grid (catalog rows D-01…D-10 ride a separate
  spec), but the U-19 case exercises the **integration path** — that the
  picker's `handleGridKeyDown` actually wires `Home` / `End` through
  `moveFocus`
  (`packages/ui/src/DeliveryDatePicker.tsx:310`). The test opens the picker,
  focuses a mid-week cell (Wed 17 Jun 2026, ISO `2026-06-17`), presses
  `Home`, asserts the focused cell's `data-iso` (or its accessible name) is
  the Monday of that week, then presses `End`, asserts the focused cell is
  the Sunday of that week. Iso values for the row containing 17 Jun 2026:
  Mon = 2026-06-15, Sun = 2026-06-21.

### 1c — UX state machine (Phase 2c, only the `new` rows: U-20, U-21, U-22, U-24, U-25, U-26)

| ID   | Title                                                     | Asserts                                              | Catches                                    | Spec |
| ---- | --------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------ | ---- |
| U-20 | `data-state` transitions open → closing → closed in order | `dialog.dataset.state==="closing"` before unmount    | State skip / instant unmount               | new  |
| U-21 | Backdrop `data-state` matches modal during exit           | both backdrop + modal carry `"closing"` concurrently | Backdrop unmounts a frame off              | new  |
| U-22 | Safety-net timer unmounts modal without `animationend`    | fake timers + 320 ms advance                         | Timer not set / fires too late             | new  |
| U-24 | Confirm fires `onConfirm` with **draft** (not committed)  | pick non-earliest, Confirm, payload is the new ISO   | `pendingConfirm` holds the committed value | new  |
| U-25 | Closed-card day number updates after confirm              | mini-calendar reads the new `getUTCDate()`           | `dayNumber` stale                          | new  |
| U-26 | "Earliest delivery" → "Delivery date" label swap          | confirm a later day, caption flips                   | `isEarliest` predicate broken              | new  |

Notes:

- **U-20** opens the picker, asserts `dialog.dataset.state === "open"`,
  clicks Cancel, asserts `dialog.dataset.state === "closing"` **before**
  firing `animationend`, then calls `finishCloseAnimation(dialog)` and
  asserts the dialog is gone from the DOM (`queryByRole("dialog") === null`).
  The order assertion catches a regression that skips `"closing"` and
  unmounts synchronously.
- **U-21** locates both `.sdp-modal` and `.sdp-backdrop` on Cancel, asserts
  **both** carry `data-state="closing"` in the same synchronous read, then
  finishes the close cleanly.
- **U-22** is the only case in this spec that uses fake timers. Pattern:
  ```ts
  jest.useFakeTimers({ doNotFake: ["nextTick"] });
  try {
    // open, click Cancel, do NOT fire animationend
    act(() => {
      jest.advanceTimersByTime(320);
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  } finally {
    jest.useRealTimers();
  }
  ```
  This pins the `setTimeout(finishClose, 320)` line at
  `packages/ui/src/DeliveryDatePicker.tsx:258` against either being dropped
  or being given the wrong duration. Spec 024 documented the same fake-timer
  pattern in its §2 prose but did not actually exercise the safety net (its
  five tests all drive `finishCloseAnimation`); U-22 closes that gap.
- **U-24** passes an `onConfirm` spy, opens the picker, picks a later
  deliverable day via `ArrowRight` + `Enter`, presses Confirm, asserts the
  spy was called exactly once with the **draft** ISO (e.g.
  `"2026-06-17"`), not with the original committed value (`"2026-06-15"`).
  This catches a regression where `pendingConfirm.current` is set to the
  committed value instead of `draft` at
  `packages/ui/src/DeliveryDatePicker.tsx:249`.
- **U-25** and **U-26** are partly already covered by 024's §2.4 "Dynamic
  closed-state re-render" test, but the catalog kept them as discrete pins:
  U-25 strictly asserts the closed-card day number text after Confirm
  (e.g. `17`), U-26 strictly asserts the caption text flips from
  `DEFAULT_DELIVERY_LABELS.earliestDelivery` to
  `DEFAULT_DELIVERY_LABELS.deliveryDate`. The reviewer should be aware that
  these two cases overlap with 024's §2.4 — see **Decisions for the
  reviewer** below for whether to keep them as separate `it()` blocks or
  fold them into a single existing test.

### 1d — Theming code-quality (Phase 2d, U-27, U-28, U-29)

| ID   | Title                                             | Asserts                                                                                                          | Catches                                        | Spec |
| ---- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---- |
| U-27 | Both themes render identical DOM + ARIA structure | gridcell count, role tree, `aria-selected`/`aria-disabled` set are equal across `sorrelTheme` and `brambleTheme` | Brand branch adding/removing DOM               | new  |
| U-28 | Blocked cells identical under both themes         | ISO date set with `aria-disabled="true"` is equal across themes                                                  | Brand branch over/under-blocking               | new  |
| U-29 | `DeliveryTheme` structural completeness           | TS compile-check file — both theme objects satisfy the interface without `as`                                    | Token key added to one theme but not the other | new  |

Notes:

- **U-27** renders the picker twice (one render call per theme), opens the
  dialog for each, then runs four parity assertions: the number of
  `[role="gridcell"]` nodes, the multiset of role tags inside the dialog
  (e.g. `dialog`, `grid`, `row`, `gridcell`), the ISO set of cells carrying
  `aria-selected="true"`, and the ISO set of cells carrying
  `aria-disabled="true"`. Both themes import from
  `packages/ui/src/theme/tokens.ts` (`sorrelTheme`, `brambleTheme`).
- **U-28** is the focused variant of U-27 that asserts only the
  `aria-disabled="true"` ISO set is equal. Kept separate because a
  brand-branch regression (e.g. adding a brand-specific blocked weekday in
  the Bramble path) would surface here without the noise of the broader
  DOM-tree diff.
- **U-29** is **not** a runtime test. It is a TS compile-check file at
  `packages/ui/src/theme/__type-checks__/DeliveryTheme.types.ts` whose only
  purpose is to fail `yarn type-check` if either theme stops structurally
  satisfying `DeliveryTheme`. Recommended pattern (the implementer may
  refine, but no production-code change is allowed):

  ```ts
  // packages/ui/src/theme/__type-checks__/DeliveryTheme.types.ts
  // Compile-time only. No runtime export, no side-effects.
  import type { DeliveryTheme } from "../tokens";
  import { brambleTheme, sorrelTheme } from "../tokens";

  // Structural assignability — no `as DeliveryTheme` widening allowed.
  // If a token key is added to DeliveryTheme but not to one of the themes
  // (or vice versa), `yarn type-check` fails here.
  const _sorrel: DeliveryTheme = sorrelTheme;
  const _bramble: DeliveryTheme = brambleTheme;
  // Mark the locals as intentionally unused per the existing TS / ESLint config.
  void _sorrel;
  void _bramble;
  ```

  The implementer confirms the file is picked up by the workspace `tsconfig`
  (it should be by default — `packages/ui` compiles its `src/**/*.ts(x)`
  tree) and that lint does not reject the `_-prefixed` unused locals; if
  the repo's lint config does, fall back to a single
  `export type _DeliveryThemeCompleteness = …` conditional-type pattern
  that produces no runtime artefact. The constraint is **fix the type
  check, do not suppress with `as`, `// @ts-ignore`, or
  `// eslint-disable`** (per the memory-pinned root-cause rule).

## 2 — No other files

No edits to `packages/ui/src/DeliveryDatePicker.tsx`,
`packages/ui/src/theme/tokens.ts`, `packages/ui/src/theme/styles.ts`,
`packages/ui/src/index.ts`, `packages/ui/jest.config.ts`,
`packages/ui/jest.setup.ts`, `packages/ui/package.json`, or anything outside
`packages/ui`. The runner and dev dependencies introduced by spec 024
(`jest`, `ts-jest`, `@types/jest`, `jest-environment-jsdom`,
`@testing-library/react`, `@testing-library/user-event`,
`@testing-library/jest-dom`, `jest-axe`, `@types/jest-axe`) are reused as-is.
No new dependencies.

# Contract impact

**None.** Test-only and one TS compile-check file. No `schema.graphql` change.
No `packages/domain` change. No new public exports. The implementations these
tests pin **already exist** in the current source — this spec catches **future
regressions**, it does not introduce new behaviour.

The closest thing to a contract statement in this spec is **U-07**, which
documents that the current `defaultValue ?? earliest` line at
`packages/ui/src/DeliveryDatePicker.tsx:192` accepts a blocked `defaultValue`
as-is. The test pins that behaviour; a future change to clamp blocked
`defaultValue` up to `earliest` would require its own contract-change spec.

# Out of scope

- **U-08…U-15** (a11y semantics — `dialog-name`, `aria-required-children`,
  `aria-allowed-attr`, `aria-selected` placement on the focused `<button>`,
  blocked / before-earliest cell `aria-label`, live region) — those ride
  **spec 025** and land with that implementation. They are **not** in this
  spec.
- **U-23** (reduced-motion + safety-net idempotency) — rides **spec 029**.
  Not in this spec.
- **U-13** (hover, press, blocked-cell hover-leak) and the equivalent C-13 /
  C-14 / C-15 — those are **spec 028**'s scope.
- **D-01…D-10** (domain pure-fn edge cases — leap February, DST,
  `mondayIndex` year-boundary, `earliestDeliverableDate` variants,
  `moveFocus` Sunday + End) — ride the separate
  `calendar-domain-edge-cases` spec.
- **Phase 3 / Phase 4** of the catalog: all Cypress cases (C-\*) and the
  ESLint domain-boundary guard. Cypress rides its own bootstrap spec; the
  ESLint guard rides its own spec.
- **Any production source change** to `DeliveryDatePicker.tsx`,
  `theme/tokens.ts`, `theme/styles.ts`, or `calendar.ts`. If U-29's
  compile-check surfaces a real type drift, the fix is on the theme files —
  but that surface check is the test's whole point, so any such fix lands
  under a separate spec, not this one.
- **Removing or rewriting the 14 cases spec 024 landed.** They are
  untouched. U-25 / U-26 overlap with 024's §2.4 by design — see decision
  (3) below for what to do about it.
- **Snapshot / visual / Chromatic / Storybook tests.** None.
- **New dependencies** of any kind. The runner already exists.

# Decisions for the reviewer

1. **U-07: pin or change the `defaultValue` contract.** This spec defaults to
   **pin** — assert that a blocked `defaultValue` is accepted as-is, matching
   the current source line at
   `packages/ui/src/DeliveryDatePicker.tsx:192`. The alternative is to **flip
   the contract** in a follow-up spec so the picker clamps blocked
   `defaultValue` up to `earliest`, then have U-07 here assert the new
   behaviour. Either choice is fine, but they cannot both ship — recommend
   the pin-the-current-behaviour path and leave the contract-change as a
   separate proposal.
2. **U-22 fake-timer scope.** Default: only the single `it()` block for U-22
   uses `jest.useFakeTimers`, wrapped in `try/finally` with
   `jest.useRealTimers()`. The alternative is a `describe` block with
   `beforeEach`/`afterEach`. Recommend the per-test wrapping — smaller blast
   radius if the timer interaction misbehaves with `userEvent`'s internal
   awaits.
3. **U-25 / U-26 vs spec 024 §2.4.** Spec 024 §2.4 already asserts the closed
   card re-renders after Confirm (the day number text and the caption flip).
   U-25 / U-26 in the catalog re-pin both as discrete cases. Two options:
   - **(A) — recommended:** keep U-25 / U-26 as their own focused `it()`
     blocks so a regression in either is visible in the test name. The
     overlap with 024's §2.4 is small and harmless.
   - **(B):** strengthen the existing 024 §2.4 test in-place and skip
     U-25 / U-26 here. Risk: 024 §2.4 grows hard to read.
4. **U-29 compile-check file location.** Default:
   `packages/ui/src/theme/__type-checks__/DeliveryTheme.types.ts` — a
   conventional `__type-checks__/` folder name keeps the intent visible. The
   alternative is `packages/ui/src/theme/DeliveryTheme.types.test-d.ts` (the
   `tsd` convention). This spec does not add `tsd`; the simpler path is the
   default. Reviewer confirms.
5. **`data-state` selector for U-20 / U-21.** Default: read
   `el.dataset.state` directly off the dialog and backdrop DOM nodes
   (`querySelector(".sdp-modal")`, `querySelector(".sdp-backdrop")`).
   The alternative is `getByTestId(…)`, which would require adding
   `data-testid` to the production source — out of scope. Reviewer confirms
   the class-name selectors are acceptable.

# Acceptance criteria

- [ ] `yarn type-check` green (0 errors / 0 warnings) repo-wide, including
      the new `packages/ui/src/theme/__type-checks__/DeliveryTheme.types.ts`
- [ ] `yarn lint` green (0 errors / 0 warnings) repo-wide
- [ ] `yarn workspace @sorrel/ui test` runs and exits 0, with **all 22 new
      cases** (U-01…U-07, U-16…U-22, U-24…U-29) green and the existing 14
      spec-024 cases untouched and still green
- [ ] `jest-axe` assertions in the file (spec 024's two `axe` runs) remain
      clean — this spec does not regress them
- [ ] `yarn workspace @sorrel/domain test` still runs and stays green (this
      spec does not touch domain)
- [ ] No production source changes in
      `packages/ui/src/DeliveryDatePicker.tsx`,
      `packages/ui/src/theme/tokens.ts`, `packages/ui/src/theme/styles.ts`,
      or `packages/domain/src/delivery/calendar.ts`
- [ ] No new public exports from `packages/ui` or `packages/domain` (no edits
      to `packages/ui/src/index.ts`, `packages/domain/src/index.ts`, or
      `packages/domain/src/delivery/index.ts`)
- [ ] No new dependencies in any `package.json`
- [ ] U-29's compile-check file fails `yarn type-check` if **either**
      `sorrelTheme` **or** `brambleTheme` is mutated to drop a key required
      by `DeliveryTheme` — verified by the implementer as a one-time
      revert-and-confirm-red step before the PR (e.g. temporarily comment out
      `radiusPill` on `sorrelTheme`, observe `tsc` fail at the assignability
      line, restore)
- [ ] U-22's fake-timer path is contained to that single `it()` block; no
      stray `jest.useFakeTimers` leaks into surrounding tests
- [ ] `apps/web` stays App\*-only (spec 018) — no `sx`, no raw `@mui`
      introduced; this spec touches no `apps/web` file
- [ ] No real-brand names / assets; the word "bait" appears nowhere; this is
      Sorrel (fictional)

# Analytics

**No new typed funnel events fire.** This spec is test-only on a
`packages/ui` primitive that emits no analytics itself; funnel-level events
(`funnel_step_viewed`, `step_completed`, `field_error`, `funnel_abandoned`)
are fired by `apps/web` per specs 009 / 010 / 020, not by the picker. The
`@sorrel/analytics` contract is unchanged.

- `funnel_step_viewed` — **not fired** by this spec.
- `step_completed` — **not fired** by this spec.
- `field_error` — **not fired** by this spec.
- `funnel_abandoned` — **not fired** by this spec.
