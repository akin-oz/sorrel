---
spec: 025
title: Close the screen-reader story on the DeliveryDatePicker dialog (background inertness, live region, focused-element selection state, focusable-selector hygiene)
status: proposed
approved: yes
tier: 1 # compliance gap on the centrepiece
owner: packages/ui
---

> Sequencing note: this spec's `jest-axe` acceptance criterion depends on the
> test setup introduced by **spec 024** (a11y test pack for the calendar). The
> PR order is **024 → 025**. 025 does not invent any test infrastructure; it
> consumes the harness 024 lands.

# Problem / gap

An internal accessibility review of `packages/ui`'s `DeliveryDatePicker` (the
funnel's centrepiece dialog) surfaced four distinct screen-reader gaps. The
review summary: the dialog is **complete on focus management, incomplete on
screen-reader story**. The keyboard model is correct — roving tabindex, Tab
trap, ESC close, return-focus — but the dialog leaks to AT virtual cursors,
announces nothing when the draft selection changes, hangs `aria-selected` on a
wrapper the focused element does not inherit from, and uses a focusable-element
selector that misleads maintainers about how blocked days are excluded.

No existing approved spec covers these four. Spec 001 shipped the picker and
the focus-trap; specs 018/019 reskinned/parity'd it. Spec 024 (in flight) adds
the `jest-axe` harness but does not change component semantics. This spec
bundles the four semantic fixes into a single PR so the dialog's screen-reader
story closes in one commit, gated by the harness 024 introduces.

The four gaps, with verified code coordinates:

1. **R2 — Background is not neutralised while the modal is open.**
   `packages/ui/src/DeliveryDatePicker.tsx:501-507` renders the dialog inside a
   `position: fixed; inset: 0; zIndex: 1000` overlay. The Tab cycle is trapped
   by `getFocusable` (line 106) + the keyboard handler, but no `inert` /
   `aria-hidden` is applied to sibling page content. A screen reader's virtual
   cursor (NVDA browse-mode, VoiceOver rotor) can escape the dialog subtree and
   read the page beneath. WCAG 2.4.3 / 4.1.2 expectations for modal dialogs.

2. **R3 — No `aria-live` status region.** There is no live region anywhere in
   the picker. When the draft selection changes (arrow keys move focus and the
   handler commits a draft), AT users get no confirmation. When a blocked day
   is attempted (click or Enter/Space on an `aria-disabled="true"` cell), there
   is also no announcement — the visual `reasonText` (line 666-668) is only
   surfaced through the day button's `aria-label`, which the user has to
   re-read with focus. WCAG 4.1.3 (Status Messages).

3. **R4 — `aria-selected` is on a wrapper, not the focused element.** Line 702
   places `role="gridcell" aria-selected={cell.isSelected}` on the wrapping
   `<div>`. Roving tabindex focuses the inner `<button>` (`tabIndex` set at
   line 710). Some screen readers do not propagate the wrapper's `aria-selected`
   down to the focused descendant, so users hear the date but not its selection
   state. WCAG 4.1.2 (Name, Role, Value).

4. **R8 — `getFocusable` selector hygiene.** Line 109 queries
   `'button:not([disabled]), [tabindex]:not([tabindex="-1"])'`. Blocked day
   buttons use `aria-disabled="true"` (line 712) — never the native `disabled`
   attribute, because they must retain DOM focusability for the roving-tabindex
   contract. They are currently excluded from the Tab cycle only because
   `tabIndex={-1}` (line 710) catches them in the second clause. Harmless
   today, but the selector reads as if it were the guard — a footgun for
   future maintainers who relax the tabindex discipline.

# Scope

Pure UI semantics + one DOM side-effect on a sibling node's `inert`
attribute. No schema, no domain, no analytics, no new dependencies.

**File touched (single):** `packages/ui/src/DeliveryDatePicker.tsx`.

**Symbols touched (verified against the file):**

- The outer overlay `<div style={{ position: "fixed", inset: 0, zIndex: 1000 }}>`
  at line 501 — and the open/close lifecycle that already drives
  `DialogState` (line 95) + `onOpenChange` (line 92). The `inert` mutation
  attaches and detaches alongside the dialog's open/closed transitions.
- The dialog `<div role="dialog" aria-modal="true" aria-labelledby={labelId}>`
  at line 508-516 — receives a new visually-hidden `role="status"
  aria-live="polite"` child.
- The `DayCell` component (lines 655-720) — the `<div role="gridcell">` /
  `<button>` pair is restructured or annotated to carry selection state on the
  focused element.
- `getFocusable` (lines 106-114) — selector tightened or commented.

## R2 — Background neutralisation (`inert`)

While the dialog is open (`DialogState === "open"`), apply `inert` to the page
content outside the dialog subtree. Remove it on close (including during the
`"closing"` state's exit animation — see decision below).

- **DOM target:** the recommended target is the dialog overlay's
  *previousElementSibling* / *nextElementSibling* chain on `document.body` —
  i.e. mark every body child that is **not** the overlay as `inert`. This
  avoids requiring the host app to expose a specific `<main>` ID and is robust
  to the picker being rendered in any host layout. Alternative: require the
  host to wrap its app in an element the picker can find by a documented
  attribute (e.g. `[data-sdp-page-root]`). **Decision below.**
- **Fallback:** when `HTMLElement.prototype.inert` is unsupported (older
  Safari), set `aria-hidden="true"` on the same target(s) — the `inert`
  spec is implemented in all current evergreen browsers but a defensive
  fallback costs nothing.
- **Cleanup contract:** the effect that toggles `inert` MUST remove it on
  unmount and on every transition out of `"open"`, including when the
  component unmounts mid-`"closing"`. Use a single `useEffect` keyed off
  the dialog state.
- The dialog's own subtree is never marked `inert`.

## R3 — Live status region

Add a visually-hidden child of the dialog with
`role="status" aria-live="polite" aria-atomic="true"`. Use the existing
`FONT_SANS` token only if the node has any visible style; the standard
visually-hidden clip pattern (`position: absolute; width: 1px; height: 1px;
overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space:
nowrap;`) is sufficient.

Two announcement triggers, both already available in the existing render
path:

- **Draft change** (arrow keys / `onGridKeyDown` moving focus to a
  deliverable day). Message: a new label on `DeliveryLabels`, e.g.
  `selectionAnnouncement: (date: string) => string` defaulting to
  `Delivery set to ${date}`. The date is formatted via the existing
  `formatDate` helper (line 64) with `{ weekday: "long", day: "numeric",
  month: "long" }` (or the format chosen below).
- **Blocked day attempt** (click or Enter/Space on a cell whose
  `cell.blocked === true`). The existing `blockedReasonText` (line 68)
  already produces the localised reason (weekday name or
  `beforeEarliest`). The live region echoes that string.

The label additions are **additive** to `DeliveryLabels` (line 30) and
`DEFAULT_DELIVERY_LABELS` (line 42), so the existing host wiring
(`next-intl` in `apps/web`) keeps working without translation changes —
defaults fill in until the host opts in.

## R4 — `aria-selected` on the focused element

Pick one of two shapes — **decision below**:

- **(a) Restructure — recommended.** Drop the wrapping `<div role="gridcell">`
  and put `role="gridcell"` + `aria-selected={cell.isSelected}` directly on
  the `<button>`. The wrapper currently carries no layout responsibility
  (the parent `<div role="row">` at line 584 uses `display: grid` with
  `gridTemplateColumns: "repeat(7,1fr)"` and each child is the gridcell).
  Empty cells at line 588 keep their wrapper `<div role="gridcell"
  aria-hidden>` because they have no button.
- **(b) Annotate.** Keep the wrapper and add `aria-pressed={cell.isSelected}`
  to the `<button>`. Cheaper diff, but `aria-pressed` is the wrong role
  semantically for a calendar grid cell and risks confusing AT users about
  the button's nature (toggle vs grid selector).

Recommendation: **(a)**. The wrapper is purely structural and the
restructured tree matches the WAI-ARIA Authoring Practices grid pattern
the picker already otherwise follows.

## R8 — Focusable-selector hygiene

Pick one of two shapes — **decision below**:

- **(a) Tighten the selector.** Change line 109 from
  `'button:not([disabled]), [tabindex]:not([tabindex="-1"])'` to
  `'button:not([disabled]):not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"])'`.
  Belt + braces: blocked-day buttons are excluded both by their
  `tabIndex={-1}` and by `aria-disabled="true"`.
- **(b) Add an inline comment.** Document that the tabindex discipline at
  line 710 is the actual guard, so future maintainers do not "fix" the
  selector by deleting the tabindex.

Recommendation: **(a)** — defence in depth, and the resulting selector
documents the contract.

# Contract impact

**None on `schema.graphql` or `packages/domain`.** No GraphQL types change;
no domain helpers change; `DateCell` / `BlockedReason` / `IsoDate` (line
15-23) are consumed unchanged. The `moveFocus` (line 22) /
`buildMonthView` / `earliestDeliverableDate` calls are untouched.

The **public `DeliveryLabels` shape** in `packages/ui` gains an optional
field (e.g. `selectionAnnouncement?: (date: string) => string`). This is
additive — `DeliveryDatePickerProps.labels` is already
`Partial<DeliveryLabels>` (line 88) and `DEFAULT_DELIVERY_LABELS` (line 42)
supplies the default. No host call sites break; `apps/web` opts in by
adding a translation key. The blocked-day announcement reuses the existing
`blockedWeekday` / `beforeEarliest` callbacks (lines 38-39), so no second
label is needed there.

No generated-type consequence.

# Out of scope

- **The `jest-axe` harness + interaction-test pack** itself (spec 024). 025
  consumes the harness; it does not introduce it. The acceptance line
  below explicitly notes the dependency.
- **Visual or animation polish** (specs 028, 029) — the existing
  `data-state`-driven CSS at lines 503/511 stays as-is.
- **Any new focus-management behaviour beyond the four listed.** The Tab
  trap, ESC close, and return-focus on close are not touched.
- **`apps/web` translation copy** for the new optional label — the default
  English fallback is sufficient to ship 025; localisation lands separately
  as a copy-only change.
- **Touching `services/api`, `packages/domain`, `packages/analytics`, or
  `schema.graphql`.**
- **New external dependencies.** No new npm packages. `inert` is a native
  HTML attribute.

# Decisions for the reviewer

1. **`inert` target.** Mark every `document.body` child that is not the
   overlay (recommended — host-agnostic) vs require the host to mark a
   specific page-root element with `[data-sdp-page-root]`.
2. **`inert` lifecycle around the closing animation.** Drop `inert`
   immediately on `"closing"` (recommended — exit animation is non-
   interactive and returning AT to the page sooner is friendlier) vs
   keep it until `DialogState === "closed"`.
3. **R4 shape:** restructure to put `role="gridcell"` on the `<button>`
   (recommended) vs add `aria-pressed`.
4. **R8 shape:** tighten the selector (recommended) vs comment-only.
5. **Selection-announcement format.** `Delivery set to {weekday, day month}`
   (recommended) vs short form `Delivery set to {day month}`. Affects the
   default value of the new `selectionAnnouncement` label.

# Acceptance criteria

- [ ] `yarn type-check` green (0 errors/warnings).
- [ ] `yarn lint` green.
- [ ] **Depends on spec 024 being merged first:** `jest-axe` reports zero
      violations against the open dialog, using the test harness 024
      introduces. If 024 has not landed, this acceptance line is
      explicitly deferred and 025 does not merge.
- [ ] With the dialog open, an AT virtual cursor (NVDA browse-mode and
      VoiceOver rotor — manual pass) cannot reach any element outside the
      dialog subtree. Verified on the `apps/web` Delivery step.
- [ ] On arrow-key navigation to a deliverable day, the live region
      announces the new draft selection (NVDA + VoiceOver manual pass).
- [ ] On click / Enter / Space on a blocked day, the live region
      announces the localised reason from `blockedReasonText` (NVDA +
      VoiceOver manual pass).
- [ ] On focus, the day button announces its selection state
      (`aria-selected` on the focused `<button>` per decision 3a, or
      `aria-pressed` per 3b).
- [ ] `getFocusable` either uses the tightened selector (decision 4a) or
      carries an inline comment documenting tabindex as the real guard
      (4b).
- [ ] Existing 024 tests for the focus-trap, ESC close, and return-focus
      behaviour stay green — no regression.
- [ ] The new optional `selectionAnnouncement` field on `DeliveryLabels`
      is documented (JSDoc on the interface in
      `packages/ui/src/DeliveryDatePicker.tsx`); `DEFAULT_DELIVERY_LABELS`
      supplies the default; the existing `apps/web` host wiring keeps
      working with no translation change required to ship.
- [ ] No `sx`, no `@mui` introduced in `packages/ui` (the package never
      uses them; reasserted here so the spec is self-contained).
- [ ] No new npm dependency added to `packages/ui/package.json`.
- [ ] No real-brand names/assets; the word "bait" appears nowhere.

# Analytics

**None.** This spec emits no funnel events. The Delivery step's existing
`funnel_step_viewed` / `step_completed` / `funnel_abandoned` emissions
(spec 009 typed contract, plumbed by spec 010/014) are unchanged — the
calendar's open/close lifecycle and confirm path keep firing the same
events with the same props. No `field_error` is introduced for the
blocked-day path; the live-region announcement is the AT signal, and the
existing per-cell `aria-label` (`packages/ui/src/DeliveryDatePicker.tsx`
line 711) remains the visual/AT label on the cell itself.
