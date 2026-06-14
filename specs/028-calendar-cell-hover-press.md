---
spec: 028
title: Calendar cell hover + press feedback in DeliveryDatePicker
status: proposed
approved: no # ONLY a human flips this to yes — implementation is gated on it
tier: 2
owner: packages/ui
---

# Problem / gap

A UX review of the `DeliveryDatePicker` flagged a missing pointer-state story:
day cells have **no `:hover` and no `:active` press feedback**. The injected
stylesheet in `packages/ui/src/theme/styles.ts` (constant `DELIVERY_PICKER_CSS`)
defines only `.sdp-cell:focus-visible` — there is no pointer-state styling at
all. On iOS, tapping a cell produces no press feedback before the draft
selection commits, which reads as unresponsive.

No existing approved spec covers cell pointer states:
- Spec 001 (`Delivery date picker`) ships the keyboard / a11y / animation shell
  but does not define `:hover` or `:active`.
- Spec 018 (`App* UI layer`) is about the MUI-replacement primitive layer in
  `apps/web`, not the picker's injected CSS.

This is the minimum change required to close the gap.

# Scope

Exactly one file is touched:

- `packages/ui/src/theme/styles.ts` — add two new CSS rules inside the existing
  `DELIVERY_PICKER_CSS` template literal. No new exports, no new tokens, no
  new files.

The two rules:

1. `.sdp-cell:not([aria-disabled="true"]):hover` — a subtle hover surface
   change derived from the existing per-instance CSS variable
   `--sdp-accent` (already set on the root in `DeliveryDatePicker.tsx` via
   `rootVars`, alongside `--sdp-surface`). No new colour tokens; the visible
   change is a low-alpha tint or a 1px border swap using `--sdp-accent`,
   pickable in both Sorrel and Bramble skins because the variable carries the
   per-skin value.
2. `.sdp-cell:not([aria-disabled="true"]):active` — a tighter pressed state
   from the same variable (e.g. a marginally stronger tint or a 1px inward
   translate). Same variable, no new tokens.

The `:not([aria-disabled="true"])` guard is required and matches the DOM that
`DeliveryDatePicker.tsx` actually emits: `DayCell` sets
`aria-disabled={cell.blocked || undefined}` on the `<button className="sdp-cell">`
(verified at `packages/ui/src/DeliveryDatePicker.tsx:712`). When a cell is
deliverable the attribute is **absent**, not `"false"`, so the
`[aria-disabled="true"]` negation is the correct selector.

The selected cell already paints `background: theme.accent` from the inline
`skin` object (lines 683–689); its visual treatment is untouched by these
rules. The rules apply to all non-blocked cells uniformly; the selected
cell's inline `background` will visually dominate.

Components, schema types, and analytics events touched: **none.** This is
pure CSS additions inside an existing injected stylesheet.

# Contract impact

None. `schema.graphql` is not touched. `packages/domain` is not touched. No
generated types change. No new package dependency.

# Out of scope

- No new colour tokens in `packages/ui/src/theme/tokens.ts`. The two new rules
  reuse `--sdp-accent` (already present per-instance) only.
- No JS / TSX changes. `DeliveryDatePicker.tsx` is untouched.
- No animation polish beyond hover + active. Specifically, staggered row
  entrance, spring physics, and any further "above-and-beyond" motion polish
  are explicitly **not** in scope here.
- Selected-day cell visual treatment is unchanged.
- Focus-visible rule is unchanged.
- No changes to `prefers-reduced-motion` handling.
- No changes to the closed-card `Change` button hover state (separate
  surface).

# Acceptance criteria

- [ ] Two new CSS rules added to `DELIVERY_PICKER_CSS` in
      `packages/ui/src/theme/styles.ts`, both using only the existing
      `--sdp-accent` CSS variable.
- [ ] Hover on a deliverable day produces a visible feedback change in
      Chromium and Safari (manual check in the wizard delivery step).
- [ ] Active state (mousedown / iOS tap) produces a tighter pressed state
      that is visually distinct from hover.
- [ ] Blocked days (rendered with `aria-disabled="true"`) show **neither**
      hover nor press feedback under any pointer device.
- [ ] The selected day's existing `background: theme.accent` continues to
      render unchanged.
- [ ] The `:focus-visible` ring continues to render unchanged when a cell
      receives keyboard focus.
- [ ] `prefers-reduced-motion` behaviour is unchanged (the new rules are
      static, no transitions are introduced).
- [ ] `yarn type-check` green (0 errors/warnings).
- [ ] `yarn lint` green.
- [ ] No regression in the test set proposed by spec 024 once it lands
      (forward-compatibility check, not a blocker if 024 is unapproved).

# Analytics

None. This is a presentation-only change; no funnel events fire as a result
of pointer hover or press on a calendar cell. Existing `step_completed`
behaviour on confirm (spec 001) is unaffected.
