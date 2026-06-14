---
spec: 024
title: Pin the DeliveryDatePicker close-chain, blocked-NO-OP, and return-focus behaviours behind a Jest + Testing Library + jest-axe scaffold in packages/ui
approved: yes
tier: 1 # regression-proofing the calendar centrepiece before the take-home submit
owner: packages/ui · packages/domain
---

> Roadmap note: this is **R1** in a four-spec calendar series. It is the foundation
> the next three sit on. 025 (a11y semantic hardening — R2/R3/R4/R8), 028 (hover /
> press polish), and 029 (reduced-motion tightening) all land on top of this test
> scaffold and rely on it to catch their own regressions. None of them are written
> or approved yet; this spec deliberately does not touch their scope.

# Problem / gap

An internal review of the existing `packages/ui` `DeliveryDatePicker`
(`packages/ui/src/DeliveryDatePicker.tsx`) surfaced the same headline finding
under three lenses (correctness, QA, accessibility): **every D1 / A–E behaviour
in the component is correct in source but unpinned by any automated test.** A
future refactor that drops the `finalized` ref guard (line 149, 207–217), swaps
the `state !== "closed" && <Modal …/>` conditional mount (line 278) for a
`display: none` style, or removes the `if (cell && !cell.blocked)` NO-OP in
`selectIfDeliverable` (line 227) would ship a clean `yarn type-check && yarn lint`
and a green CI — because no test currently exercises any of those guards.

The calendar is the centrepiece of the funnel and the centrepiece of the
take-home. The component already exists (shipped under spec 001); what is missing
is the regression net around it. No existing approved spec covers tests for the
picker:

- Spec **001** (`specs/001-delivery-date-picker.md`) defines the component and
  its tokens — no test scaffold.
- Spec **018** (`specs/018-app-ui-layer.md`) introduces `packages/ui`'s App\*
  primitives, not a test runner.
- The only Jest runner in the monorepo today lives in **`packages/domain`**
  (`packages/domain/jest.config.ts`, `testEnvironment: "node"`,
  `transform: ts-jest`). `packages/ui/package.json` has **no `test` script** and
  **no Jest config** — confirmed: its `scripts` block contains only
  `"type-check": "tsc --noEmit"`. The "Run unit tests" command in
  `.claude/CLAUDE.md` is `yarn workspace @sorrel/domain test`. `packages/ui`
  cannot be tested today; standing up the runner is part of this spec's setup
  cost (see **New dependencies**).

This spec adds the smallest possible test scaffold to `packages/ui` and pins the
five specific behaviours below, plus a `jest-axe` pass on both the closed and
open states, plus two domain edge-case tests in
`packages/domain/src/delivery/calendar.test.ts` that the current suite does not
cover (year-crossing earliest and a month ending on a non-Sunday). Test-only;
no production code changes.

# Scope

Test-only. No production source change in `packages/ui/src/DeliveryDatePicker.tsx`
or `packages/domain/src/delivery/calendar.ts`. Five UI behaviour tests, one
jest-axe pass on two states, two new domain edge tests, plus the Jest setup that
`packages/ui` currently lacks.

Line numbers below reference the verified source as of this spec; the
implementer reconfirms before pinning.

## 1 — Jest + Testing Library scaffold in `packages/ui` (new setup)

**Files (new):**

- `packages/ui/jest.config.ts` — mirrors the existing
  `packages/domain/jest.config.ts` pattern (the only Jest config currently in
  the repo), but with `testEnvironment: "jsdom"` (the picker uses
  `document.activeElement`, `el.focus()`, `animationend`), the same `ts-jest`
  transform, and a `setupFilesAfterEach` (or `setupFilesAfterEach: ["<rootDir>/jest.setup.ts"]`)
  pointing at the file below.
- `packages/ui/jest.setup.ts` — extends `expect` with `jest-axe`'s
  `toHaveNoViolations` matcher.
- `packages/ui/src/DeliveryDatePicker.test.tsx` — the five behaviour tests +
  the `jest-axe` pass.

**Files (edited):**

- `packages/ui/package.json` — add a `"test": "jest"` script alongside the
  existing `"type-check": "tsc --noEmit"`. No other script changes. (Whether the
  root `yarn test` aggregator is also updated is a reviewer decision below; the
  workspace-level script is the minimum.)

## 2 — Five behaviour tests in `DeliveryDatePicker.test.tsx`

Each test names the exact source location it pins, and the **failing-revert
case** the test must catch (a one-line edit a future contributor could plausibly
make that this test rejects). Tests use
`@testing-library/react` + `@testing-library/user-event` (real keyboard /
pointer events; no `fireEvent` shortcuts on a11y-critical paths). No timer
mocks except where the 320 ms safety-net timer in `requestClose` (line 201)
forces it; if used, `jest.useFakeTimers({ doNotFake: ["nextTick"] })` and
restore after each test.

### 2.1 — D1 close chain (`closing` → `animationend` → unmount)

**Pins:** `requestClose` sets `state = "closing"` (line 198) and arms the 320 ms
safety-net `closeTimer` (line 201); `handleAnimationEnd` filters bubbled
descendant animations via `event.target !== event.currentTarget` (line 221) and
delegates to `finishClose` (line 222); `finishClose` checks the `finalized` ref
(line 207), flips it true (line 208), clears the timer (line 209–212), and only
then calls `setState("closed")` (line 213). On unmount, the modal disappears via
the conditional mount on line 278 (`state !== "closed" && <Modal …/>`).

**Failing-revert case:** changing line 278 from
`{state !== "closed" && <Modal …/>}` to
`<Modal … />` (always mounted, hidden via `data-state` styles) — the test asserts
the modal element is **removed from the document** after the close chain
completes, not merely hidden. Use a query that fails on a still-mounted node:
`expect(screen.queryByRole("dialog")).toBeNull()`.

The test fires `animationend` from the modal's own root (matching `currentTarget`),
not from a descendant, so a regression that drops the `currentTarget` guard on
line 221 is caught by a companion assertion: dispatching a synthetic
`animationend` from a descendant (e.g. a `.sdp-cell` child) **must not**
trigger close.

### 2.2 — Confirm vs discard paths

**Pins:** in `requestClose(commit: boolean)` (line 190), the `commit === true`
branch sets `pendingConfirm.current = draft` (line 192) and, when uncontrolled,
`setInternalCommitted(draft)` (line 193); the `commit === false` branches set
`pendingConfirm.current = null` (line 195). Three discard entry points exist:
the Cancel button `onClick={() => requestClose(false)}` (line 297), the backdrop
`onClick={props.onBackdrop}` (line 505) wired to
`onBackdrop={() => requestClose(false)}` (line 295), and the ESC key in
`handleDialogKeyDown` (line 231–234).

**Failing-revert case:** changing the Cancel `onClick` to
`() => requestClose(true)` — the test confirms a draft change is **only**
committed via the Confirm button, **not** via Cancel, backdrop, or ESC. The
test selects a new day via keyboard (`ArrowRight` then `Enter`), then triggers
each discard path in a separate test case and asserts:

- the `onConfirm` callback the host wires up (`onConfirm` prop, line 124)
  is **not** called;
- the closed card's displayed `dayNumber` (line 390) and weekday-bearing
  formatted string (line 407) still show the original committed value.

Confirm-path assertion (separate test): after selecting and pressing the
Confirm button, `onConfirm` is called exactly once with the new ISO, the closed
card re-renders to the new day, and the modal unmounts (close chain runs).

### 2.3 — Blocked-cell NO-OP on click AND keyboard

**Pins:** `selectIfDeliverable(iso)` (line 225–228) does
`if (cell && !cell.blocked) setDraft(iso)` — i.e. it is a NO-OP on blocked
cells. Two entry points reach it: the cell button's
`onClick={() => onSelect(cell.iso)}` (line 713) and the grid keyboard handler
in `handleGridKeyDown` where `Enter` / `" "` calls
`selectIfDeliverable(activeIso)` (line 255–258).

**Failing-revert case:** dropping the `!cell.blocked` guard on line 227 so
blocked cells become selectable. The test exercises **both** paths in separate
cases:

- **Click path:** locate a `Friday` cell (Monday-index 4 → blocked weekday) in
  the rendered month, `userEvent.click` it, then press Confirm; assert
  `onConfirm` is **not** called and `draft` (observed via the closed card's
  re-render) is unchanged.
- **Keyboard path:** with the picker open, `ArrowRight` / `ArrowDown` the
  active cell onto a known blocked day, press `Enter`, then `Tab` to Confirm
  and press `Enter`; same assertion. A second case repeats with `Space`
  instead of `Enter` (the `event.key === " "` branch on line 255).

A fixed `today` prop (line 117, the `today?: IsoDate` prop) is passed to make
the blocked weekdays deterministic — recommended `today="2026-06-12"` so the
earliest day is Mon 15 Jun 2026 (matches the existing
`packages/domain/src/delivery/calendar.test.ts` design case on line 75).

### 2.4 — Dynamic closed-state re-render

**Pins:** `ClosedCard` derives `dayNumber` from the **current** `committed` prop
on every render (line 338, `parseIso(committed).getUTCDate()`), and the
`isEarliest ? labels.earliestDelivery : labels.deliveryDate` caption (line 404)
flips when the committed selection moves off the earliest day. The formatted
date string (line 407) likewise re-renders.

**Failing-revert case:** caching `dayNumber` in a `useMemo(..., [])` (empty deps)
or capturing the initial `committed` in a ref — the test confirms the closed
card re-renders when `committed` changes.

The test does **not** flip props from outside (the picker is uncontrolled in
the default test setup). Instead it drives the change through the picker's own
flow: open, select a new day, Confirm, then assert the closed card's
`dayNumber` text and caption have changed. A second case verifies the caption
flip: starts with `committed === earliest` (caption =
`labels.earliestDelivery`), selects a later deliverable day, Confirms, asserts
caption is now `labels.deliveryDate`. This also indirectly exercises the
controlled-mode `value` prop (line 78) by rendering once with
`value="2026-06-15"` and once with `value="2026-06-17"` and asserting both
texts render correctly.

### 2.5 — Return-focus on close

**Pins:** the effect on line 175–179
(`if (state === "closed" && hasOpened.current) changeRef.current?.focus()`)
returns focus to the Change button (the trigger, `<button ref={changeRef} …>`,
line 427) after the modal closes. `hasOpened.current` (line 147, set true in
`open()` on line 182) ensures the effect is a no-op on the first paint, before
any user interaction.

**Failing-revert case:** dropping `hasOpened.current` from the guard on
line 176, or removing the effect entirely. The test:

1. asserts on mount that the Change button does **not** have focus (the effect
   must not run before `open()`);
2. clicks Change to open;
3. presses ESC to close;
4. awaits the close chain (`animationend` fired from the modal root, or the
   320 ms safety-net via fake timers);
5. asserts `document.activeElement === changeButton`.

A companion case repeats with the backdrop click and with Cancel; the
post-close focus target is the Change button in all three cases.

## 3 — `jest-axe` coverage on both states

In the same test file, two `expect(await axe(container)).toHaveNoViolations()`
assertions:

- **Closed trigger:** render the picker with default props; run `axe` against
  the rendered `container`. Asserts the closed card markup has zero violations.
- **Open dialog:** render, click Change to open, wait for the modal to be
  visible, run `axe` against the dialog subtree (or the whole container — the
  picker's only fixed-position element is the modal itself, so the whole
  container is fine).

`jest-axe` is configured with its defaults in this spec; any rule tuning is
explicitly **out of scope** (the spec-025 semantic hardening will decide which
rules to relax or keep). If the closed-state run reports a violation today, the
test fails — that is the intended outcome and a signal to the reviewer that
spec 025 must land before this test is enabled. See **Decisions for the
reviewer** below for the gating choice.

## 4 — Two domain edge-case tests in `packages/domain`

**File:** `packages/domain/src/delivery/calendar.test.ts` (verified path —
note this is **not** `packages/domain/src/calendar.test.ts`; the file lives
under the `delivery/` subdirectory and the test imports from `./calendar`).

Adds two cases to the existing suite. Both use the public functions already
exported from `packages/domain/src/delivery/calendar.ts` — no new exports, no
new helpers, no changes to `index.ts`.

### 4.1 — Year-crossing `earliestDeliverableDate`

The current suite (line 84–87) crosses a month boundary
(`earliestDeliverableDate("2026-06-29") === "2026-07-02"`) but does not cross a
year boundary. The new case fixes `today = "2026-12-30"` (a Wednesday;
`mondayIndex` 2) and asserts `earliestDeliverableDate("2026-12-30")` lands in
**2027**. The deterministic walk: 30 Dec + 3 lead = 2 Jan 2027
(`mondayIndex` 5 = Saturday → blocked) → 3 Jan 2027 (Sunday → deliverable),
expected `"2027-01-03"`. The test pins both the ISO string and that the
returned year is `2027`.

**Failing-revert case:** if `addDays` (line 61) or the loop in
`earliestDeliverableDate` (line 92–101) regresses to local-time math, the
year-roll fails.

### 4.2 — Month ending on a non-Sunday (partial trailing row exercise)

The current `toWeeks` lives in **`packages/ui/src/DeliveryDatePicker.tsx`**
(line 305–317), not in the domain — that distinction is explicit in this spec.
The domain side that drives `toWeeks` is `buildMonthView`'s `cells` array and
`leadingBlanks`. The existing suite (line 135–140) covers a month with leading
blanks (July 2026 starts on Wednesday → `leadingBlanks: 2`); it does not assert
the trailing edge.

The new case fixes June 2026 (`buildMonthView(2026, 6, { earliest })`) which
ends on Tuesday 30 Jun (`mondayIndex` 1) — i.e. the last week has cells in
columns Mon and Tue only, columns Wed–Sun are empty. The test asserts:

- `view.cells[view.cells.length - 1].iso === "2026-06-30"`;
- `mondayIndex("2026-06-30") === 1` (Tuesday, the non-Sunday end);
- `view.leadingBlanks + view.cells.length` equals **30** for June (no
  overflow days — the grid is a single month by design, per the comment on
  line 155–158 of `calendar.ts`).

A second assertion runs the trailing-row math the picker uses today by
**inlining** the `toWeeks` algorithm in the test (six lines, no new domain
export) and confirming the last week has exactly the expected non-null cell
count. This is the spec's one acknowledged duplication — the alternative is
exporting `toWeeks` from `packages/domain`, which is a contract change this
spec explicitly does **not** want to make (see **Contract impact**). See
**Decisions for the reviewer** below.

**Failing-revert case:** if `buildMonthView` ever stops emitting all 30 days of
June (e.g. an off-by-one in the `day <= total` loop on line 166 of
`calendar.ts`), the last-cell ISO assertion fails.

# Contract impact

**None.** No `schema.graphql` change. No `packages/domain` source change — only
new tests in `packages/domain/src/delivery/calendar.test.ts`. No new public
exports from `packages/ui` or `packages/domain`. The two `index.ts` files
(`packages/ui/src/index.ts`, `packages/domain/src/index.ts`,
`packages/domain/src/delivery/index.ts`) are not edited. `toWeeks` stays a
private helper in `DeliveryDatePicker.tsx` (line 305) — its tests live in the
UI test file or, for the domain-edge case, inline in the domain test (see 4.2).

# Out of scope

- **The accessibility semantic changes themselves** — R2 (the role on the
  Change trigger, the `aria-label` on it), R3 (the `aria-live` region for the
  closed-card caption change), R4 (whether the `role="grid"` is the right
  primitive at all), R8 (the dialog title's `aria-labelledby` shape). Those are
  **spec 025** and will land after this scaffold exists. This spec only pins
  the current behaviour; if `jest-axe` flags a violation today, see the
  decisions below.
- **Hover, press, and active-state visual polish** — that is **spec 028**.
- **Reduced-motion tightening** (currently the 320 ms safety-net timeout on
  line 201 is the only reduced-motion handling) — that is **spec 029**. This
  spec does not test or change the reduced-motion path beyond ensuring the
  safety-net timer is exercised by 2.1.
- **Adding any new behaviour** to the picker. This spec only pins existing
  behaviours.
- **Visual / snapshot / Chromatic / Storybook tests** — none. The pins are
  behavioural assertions only, no DOM snapshots, no image diffs.
- **End-to-end / Playwright** — none. All tests run inside Jest + jsdom.
- **A `@sorrel/ui` test added to the root `yarn test` aggregator** if there
  is no such aggregator today — the spec adds the workspace-level
  `yarn workspace @sorrel/ui test` script; whether the repo-wide
  `yarn test` is also updated is a reviewer decision (see below).
- **Changes to existing domain tests.** Only the two new cases in §4 are
  added; the existing cases on lines 14–192 are untouched.

# New dependencies

Per `.claude/rules/no-invention.md` ("No Stealth Dependencies"), every new npm
package this spec asks the implementer to add is listed here for the human
approver to see before flipping `approved: yes`. All go into
`packages/ui/devDependencies` unless noted.

- **`jest`** — the test runner. `packages/domain` already has Jest installed
  (the script `yarn workspace @sorrel/domain test` exists per
  `.claude/CLAUDE.md`); `packages/ui` does not.
- **`ts-jest`** — TypeScript transform. Matches the
  `packages/domain/jest.config.ts` pattern (line 5–7 of that file).
- **`@types/jest`** — typings for the `describe` / `it` / `expect` globals.
- **`jest-environment-jsdom`** — required because `packages/ui` tests need DOM
  globals (`document`, `el.focus()`, `animationend`); the existing domain Jest
  uses `testEnvironment: "node"` and is not reusable.
- **`@testing-library/react`** — render + queries.
- **`@testing-library/user-event`** (v14+) — real keyboard / pointer events
  for the click vs keyboard NO-OP test in 2.3 and the ESC / Tab paths.
- **`@testing-library/jest-dom`** — matchers like `toBeInTheDocument`,
  `toHaveFocus`. Optional; the spec is small enough to skip this and use plain
  `queryByRole(…) === null` / `document.activeElement === el` — see decision
  below.
- **`jest-axe`** + **`@types/jest-axe`** — the a11y assertions in §3.

No new runtime dependencies. No changes to `packages/domain/package.json`
(its existing `jest` is reused for the two new test cases). No changes to any
other workspace's `package.json`.

If the reviewer prefers to consolidate the runner (one Jest config at the
root, both workspaces opted in), that is a structural decision flagged below
— this spec's default is a per-workspace config to match the existing
`packages/domain/jest.config.ts` shape.

# Decisions for the reviewer

1. **Gating on jest-axe (the single biggest decision).** If the closed-state
   or open-state `axe` run reports a violation against the **current** source
   (e.g. an `aria-label` the implementer didn't pin), the test fails red on
   day one. Two options:
   - **(A) — recommended:** land this spec with the `jest-axe` assertions
     enabled; if a violation appears, **spec 025 lands first** and the picker
     is updated to pass `axe` before this spec's tests are merged. The spec
     orchestration order becomes 025 → 024, not 024 → 025.
   - **(B):** land the assertions as `it.todo(…)` / `it.skip(…)` and unskip
     them inside spec 025. This lets 024 merge first as a scaffold-only PR.
     Risk: the skipped assertion gets forgotten.
2. **`@testing-library/jest-dom`: in or out.** Cleaner assertions
   (`toBeInTheDocument`, `toHaveFocus`) for one extra dev dep. Recommended:
   **in** — the tests are easier to read and the package is tiny.
3. **Per-workspace Jest config vs root config.** Default: a new
   `packages/ui/jest.config.ts` matching the existing
   `packages/domain/jest.config.ts` (per-workspace, two separate runners). The
   alternative is one root `jest.config.ts` with `projects: ["packages/*"]`.
   Recommended: per-workspace, the smaller change.
4. **Should `toWeeks` (currently `DeliveryDatePicker.tsx` line 305) become a
   `packages/domain` export so test 4.2 can call it directly?** This spec's
   default is **no** (would be a contract change; the test inlines the six
   lines). Reviewer may override if they want the helper migrated as part of
   this spec — that would change `packages/domain/src/delivery/index.ts` and
   `packages/domain/src/index.ts` and is the only path that would flip
   **Contract impact** to non-zero.
5. **Fixed-clock `today` prop in the UI tests.** Recommended:
   `today="2026-06-12"` (the existing design case in
   `packages/domain/src/delivery/calendar.test.ts` line 75) so test cells are
   deterministic. Reviewer may pick another fixed date if they want a
   different blocked-weekday landing pattern.
6. **Root `yarn test` aggregator.** Currently
   `.claude/CLAUDE.md` only documents `yarn workspace @sorrel/domain test`. If
   a root `yarn test` runs all workspaces' tests, add `@sorrel/ui` to it;
   otherwise leave the root script untouched and document the new workspace
   script. Reviewer confirms which.

# Acceptance criteria

- [ ] `yarn type-check` green (0 errors / 0 warnings) repo-wide
- [ ] `yarn lint` green (0 errors / 0 warnings) repo-wide
- [ ] `packages/ui/jest.config.ts`, `packages/ui/jest.setup.ts`, and
      `packages/ui/src/DeliveryDatePicker.test.tsx` exist
- [ ] `yarn workspace @sorrel/ui test` runs (exits 0); it does not exist today,
      this is part of the setup cost
- [ ] `yarn workspace @sorrel/domain test` still runs and stays green (the two
      new cases in §4 pass; the existing 14 cases on lines 14–192 of
      `calendar.test.ts` are unchanged)
- [ ] Every behaviour test in §2 fails when its named "failing-revert case" is
      applied to the source — verified by the implementer as a one-time
      revert-and-confirm-red step before the PR:
  - 2.1 fails when line 278 (`state !== "closed" && <Modal …/>`) is changed
    to an always-mount, **and** fails when the
    `event.target !== event.currentTarget` guard on line 221 is dropped
  - 2.2 fails when the Cancel `onClick` on line 297 is changed to
    `() => requestClose(true)`
  - 2.3 (click) and 2.3 (keyboard, both `Enter` and `Space`) all fail when
    the `!cell.blocked` guard on line 227 is dropped
  - 2.4 fails when `dayNumber` (line 338) is memoised with an empty
    dependency array
  - 2.5 fails when the `hasOpened.current` guard on line 176 is dropped
- [ ] `jest-axe` reports zero violations on the closed-trigger render and the
      open-dialog render (or per decision (1B), the tests are landed as
      `it.todo` with a comment referencing spec 025 — reviewer's call)
- [ ] No production source changes in
      `packages/ui/src/DeliveryDatePicker.tsx` or
      `packages/domain/src/delivery/calendar.ts`
- [ ] No new public exports from `packages/ui` or `packages/domain` (no edits
      to `packages/ui/src/index.ts`, `packages/domain/src/index.ts`, or
      `packages/domain/src/delivery/index.ts`)
- [ ] All new dependencies listed under **New dependencies** above appear in
      `packages/ui/devDependencies` (or `dependencies` if the reviewer flips
      one); no other `package.json` files are edited except
      `packages/ui/package.json`
- [ ] `apps/web` stays App\*-only (spec 018) — no `sx`, no raw `@mui` introduced;
      this spec touches no `apps/web` file
- [ ] No real-brand names / assets; the word "bait" appears nowhere; this is
      Sorrel (fictional)

# Analytics

**No new typed funnel events fire.** This spec is test-only; the picker emits
no analytics in its current form (it is a `packages/ui` primitive — the
funnel-level events `funnel_step_viewed` / `step_completed` /
`funnel_abandoned` are fired by the wizard shell in `apps/web` per specs 009 /
010, not by the picker). Therefore none of the four typed events listed in the
spec template apply; the `@sorrel/analytics` contract is unchanged.

The two re-narrated names from the template, for completeness:

- `funnel_step_viewed` — **not fired** by this spec.
- `step_completed` — **not fired** by this spec.
- `field_error` — **not fired** by this spec.
- `funnel_abandoned` — **not fired** by this spec.
