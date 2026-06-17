---
spec: 048
title: Add Previous/Next month navigation to the delivery date picker (WCAG 2.1.1)
status: proposed
approved: no # ONLY a human flips this to yes — implementation is gated on it
tier: 1 # 1 credible core · 2 JD coverage · 3 closers
owner: packages/ui · packages/domain
---

# Problem / gap

The `DeliveryDatePicker` centerpiece
(`packages/ui/src/DeliveryDatePicker.tsx`) renders exactly one month — the
month containing the committed selection — and offers no way to leave it. There
is no Previous/Next month control in the modal header, and grid keyboard
navigation cannot cross a month boundary: `handleGridKeyDown`
(`DeliveryDatePicker.tsx:350`) calls `moveFocus`
(`packages/domain/src/delivery/calendar.ts:219`), whose every branch wraps its
result in `clampToMonth` (`calendar.ts:190`). Arrowing off the last day of the
month lands the user back on the same day; `End`/`Home` clamp to the month's
own week.

Consequences:

- A keyboard or assistive-technology user who needs a delivery date in a future
  month **physically cannot reach it**. This is a WCAG 2.1.1 (Keyboard) Level A
  failure — content operable by pointer (none today, but it is the only escape
  hatch the design implies) that is not operable by keyboard. It is the most
  severe accessibility gap remaining in the codebase.
- The month heading (`monthId` block, `DeliveryDatePicker.tsx:662-672`) is not
  in a live region, so even if the month did change a screen-reader user would
  not be told.

No existing approved spec covers cross-month navigation. Spec 001 scoped the
single-month grid deliberately ("the grid is intentionally a single month",
`calendar.ts:159`). Specs 024 / 025 / 028 / 029 / 030 / 031 / 034 hardened the
single-month picker (a11y traps, hover/press, reduced motion, domain edge
cases, SSR) but none of them added month traversal. Spec 035 ran cypress-axe on
the dialog, which passes today only because the trap is invisible to automated
checks — axe cannot detect "this date is unreachable".

# Scope

This is a `packages/domain` + `packages/ui` change. No `apps/web`,
`services/api`, or `schema.graphql` edits. Named touch points:

**`packages/domain/src/delivery/calendar.ts`** — add one pure, exported helper
that decides where focus lands after a month change (the logic must live in the
domain per the source-of-truth rule, not be re-implemented in the UI). Proposed
signature, to be confirmed at approval:

```ts
/**
 * Pick the focus target when the calendar moves to (year, month).
 * Prefers the same `day` number in the new month if it exists AND is
 * deliverable; otherwise returns the earliest deliverable day in that month;
 * returns null if the month contains no deliverable day at all (caller keeps
 * the current focus and does not change the view).
 */
export function focusTargetForMonth(
  year: number,
  month: number,
  preferredDay: number,
  earliest: IsoDate,
): IsoDate | null;
```

It will reuse the existing `buildMonthView` / `blockedInfo` / `daysInMonth`
primitives — no new date math invented. The existing `moveFocus`,
`clampToMonth`, `buildMonthView` signatures are unchanged.

**`packages/domain/src/delivery/calendar.test.ts`** — new cases for
`focusTargetForMonth` (same-day-deliverable, same-day-blocked-falls-to-earliest,
short-month day-31 clamp, fully-blocked-month → null).

**`packages/ui/src/theme/tokens.ts`** — `DeliveryTheme` gains
`radiusModal?: number`. `sorrelTheme.radiusModal = 20`,
`brambleTheme.radiusModal = 16`. (See Contract impact for the default.)

**`packages/ui/src/DeliveryDatePicker.tsx`**:

- `DeliveryLabels` gains two **optional** fields, `prevMonth` and `nextMonth`,
  with English defaults added to `DEFAULT_DELIVERY_LABELS` (`prevMonth:
  "Previous month"`, `nextMonth: "Next month"`). Because `labels` is already
  `Partial<DeliveryLabels>` merged over the defaults
  (`DeliveryDatePicker.tsx:189`), and the two fields are added to the defaults,
  hosts that pass no labels keep working.
- New view state: the picker stops deriving `viewYear`/`viewMonth` solely from
  the committed/draft date (`DeliveryDatePicker.tsx:232-234`) and instead holds
  the visible month in component state, seeded from the committed date on
  `open()` (`DeliveryDatePicker.tsx:261`), so the view can move independently of
  the draft selection.
- Two `<button type="button">` controls in the header row
  (`DeliveryDatePicker.tsx:655-673`): Previous and Next month, each with an
  accessible name from `resolvedLabels.prevMonth` / `.nextMonth`, `minHeight`
  44 honoured (the existing 44px target convention, e.g. `:709`), themed with
  the existing tokens. The Previous button is disabled (native `disabled`, so it
  is excluded from `getFocusable`, `DeliveryDatePicker.tsx:121`) when the
  visible month is the month containing `minDate` (see below).
- `handleGridKeyDown` (`DeliveryDatePicker.tsx:350`) gains `PageUp` (previous
  month) and `PageDown` (next month) handling, per the ARIA grid date-picker
  pattern. `GRID_KEYS` (`DeliveryDatePicker.tsx:106`) is **not** extended;
  PageUp/PageDown are handled in their own branch because they change the view,
  not just the roving cell.
- A shared `goToMonth(delta)` path used by both the buttons and PageUp/PageDown:
  clamp the target month at the min month (no-op past it), call
  `focusTargetForMonth`, update the visible-month state and `activeIso`, bump
  `focusTick` so the existing focus effect (`DeliveryDatePicker.tsx:238-241`)
  refocuses the new cell.
- The month heading wrapper (the `monthId` element,
  `DeliveryDatePicker.tsx:662`) gains `aria-live="polite"` so the month name is
  announced on change. (The existing `role="status"` region at `:639` announces
  selection, not the month; the month heading is a distinct live region.)

**Min-month source.** The earliest navigable month is the month containing
`earliest` (`earliestDeliverableDate(today, leadDays)`,
`DeliveryDatePicker.tsx:198`) — i.e. there is no separate `minDate` prop today.
This spec uses `earliest` as the clamp floor and does **not** introduce a new
prop. (Decision flagged below.)

**Tests** — `packages/ui/src/DeliveryDatePicker.test.tsx`: new cases for
PageUp/PageDown month traversal, Prev/Next button clicks, focus-lands-on-same-
day-or-earliest, clamp at the min month (Prev disabled + PageUp no-op), and the
`aria-live` month announcement. All existing cases must still pass unchanged.

**Story** — the Storybook story for the picker (per spec 038) sets German
`prevMonth` / `nextMonth` labels to exercise the localised path.

# Contract impact

`schema.graphql`: **no change.** `packages/analytics`: **no change** (see
Analytics). No new npm dependencies.

`packages/domain` — additive only: one new exported pure function
`focusTargetForMonth`. It flows to `@sorrel/domain` through the existing
`export * from "./calendar"` barrel automatically. No GraphQL codegen
consequence (plain TS).

`packages/ui` `DeliveryTheme` — additive, backward-compatible:

- New field `radiusModal?: number` (optional). The modal currently hard-codes
  its corner radius as `theme.radiusControl + 8` (`DeliveryDatePicker.tsx:623`).
  The component will read `theme.radiusModal ?? theme.radiusControl + 8`, so
  any existing `DeliveryTheme` object that omits the field renders **byte-for-
  byte identically** to today (Sorrel: `12 + 8 = 20`; Bramble: `8 + 8 = 16`).
- `sorrelTheme` and `brambleTheme` set the field explicitly to the same values
  (20 and 16) so the structural compile-check
  (`packages/ui/src/theme/__type-checks__/DeliveryTheme.types.ts`) keeps both
  brands exhaustive and the values are self-documenting. Because the field is
  **optional**, the type-check would still pass without them, but setting them
  is the intent.

`DeliveryLabels` — additive: `prevMonth` and `nextMonth` are added as
**required** keys on the `DeliveryLabels` interface but supplied in
`DEFAULT_DELIVERY_LABELS`, exactly mirroring how `selectionAnnouncement`
(spec 025) was added. Hosts pass `Partial<DeliveryLabels>`, so no host is forced
to supply them. (If the human prefers them strictly optional on the interface,
that is the one-line variation to call out at approval.)

# Out of scope

- No new `minDate` / `maxDate` props on `DeliveryDatePickerProps`. The clamp
  floor is the existing `earliest`; there is no upper bound on forward
  navigation in this spec (a user can page arbitrarily far ahead, same as any
  date picker). A bounded window is a separate spec if the business wants one.
- No multi-month or overflow-day grids — the grid stays one month, matching the
  spec 001 design.
- No animated month transitions. The month swaps instantly; the modal's
  existing enter/exit animation is untouched.
- No `apps/web`, `services/api`, or `schema.graphql` changes. The wizard host
  (`apps/web/.../wizard/[step]/page.tsx`) consumes the picker unchanged.
- No new analytics events and no new funnel instrumentation inside
  `packages/ui` (the package fires none today; see Analytics).
- No change to the existing `moveFocus` / `clampToMonth` single-month branches —
  arrow keys still clamp within the visible month; only PageUp/PageDown and the
  buttons cross months.

# Acceptance criteria

- [ ] `yarn type-check` green (0 errors / 0 warnings) per
      `.claude/rules/verification.md`.
- [ ] `yarn lint` green (0 errors / 0 warnings).
- [ ] `yarn workspace @sorrel/domain test` green; new `focusTargetForMonth`
      cases pass: same-day-deliverable, same-day-blocked→earliest,
      day-31-into-30-day-month clamp, fully-blocked-month→null.
- [ ] `packages/ui` tests green; **all pre-existing**
      `DeliveryDatePicker.test.tsx` cases pass unchanged.
- [ ] New UI tests pass: (a) PageDown moves to the next month and focuses the
      same day number when deliverable; (b) PageDown onto a month where that day
      is blocked focuses the earliest deliverable day; (c) Next button click
      changes the visible month and the `aria-live` heading text updates;
      (d) Prev button is `disabled` and PageUp is a no-op when the visible month
      is the min month (month of `earliest`); (e) the month-heading element
      carries `aria-live="polite"`.
- [ ] Both Prev/Next controls are reachable by Tab inside the dialog (appear in
      `getFocusable`) and have an accessible name resolved from `labels`.
- [ ] `jest-axe` on the open dialog with a non-min month visible reports no new
      violations (extends the existing axe assertion in the test file).
- [ ] `DeliveryTheme.radiusModal` is optional; a theme object omitting it
      type-checks and renders the modal at `radiusControl + 8` (regression-proof
      default). `sorrelTheme.radiusModal === 20`,
      `brambleTheme.radiusModal === 16`.
- [ ] German `prevMonth` / `nextMonth` labels are exercised in the Storybook
      story.
- [ ] Commit subject includes the `Spec: 048` trailer.

# Analytics

**No funnel events fire from this change.** `packages/ui` is presentational and
emits no analytics; the typed funnel events (`funnel_step_viewed`,
`step_completed`, `field_error`, `funnel_abandoned`,
`packages/analytics/src/events.ts`) are emitted by the web layer
(`apps/web/.../wizard/FunnelProvider.tsx` and the seed scripts), keyed off the
picker's `onConfirm` callback — which this spec does not alter. Month
navigation changes only which day is *visible/focused*, not which day is
*committed*, so it crosses no funnel-step boundary and warrants no new event.
The existing `step_completed` for the delivery step still fires on confirm,
unchanged. If the human wants a sub-step "month_navigated" interaction event,
that is a new field on the analytics contract and must be its own spec — it is
deliberately excluded here to avoid inventing an event.
