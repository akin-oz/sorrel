---
spec: 029
title: Tighten the delivery picker reduced-motion fallback (backdrop + near-zero duration)
status: proposed
approved: no # ONLY a human flips this to yes — implementation is gated on it
tier: 2
owner: packages/ui
---

# Problem / gap

An internal accessibility review flagged a P2 reduced-motion gap in the
existing `DeliveryDatePicker` (spec 001). The current
`@media (prefers-reduced-motion: reduce)` block in
`packages/ui/src/theme/styles.ts` only overrides the **modal** animation; the
**backdrop** still plays the full 180ms `sdp-fade-in` / `sdp-fade-out`
regardless of the user's preference. Two concrete issues:

1. **Backdrop is not covered.** Looking at `DELIVERY_PICKER_CSS`
   (`packages/ui/src/theme/styles.ts`):
   - The default backdrop rules at lines 23-24 declare
     `.sdp-backdrop { animation: sdp-fade-in 180ms ease-out; }` and
     `.sdp-backdrop[data-state="closing"] { animation: sdp-fade-out 180ms ease-in; }`.
   - The reduced-motion block at lines 34-37 only mentions `.sdp-modal` / 
     `.sdp-modal[data-state="closing"]`. The backdrop selectors are absent, so a
     user with `prefers-reduced-motion: reduce` set still sees the full 180ms
     fade.

2. **"Reduced" is not "imperceptible".** The current reduced-motion durations are
   `120ms` for the modal (lines 35-36). That is a reduction, but the stricter
   WCAG 2.3.3 / "no perceptible motion" interpretation expects near-zero
   (≤ 1ms). The animation must still **fire** so the `animationend` event
   dispatches and drives `handleAnimationEnd` → `finishClose`
   (`packages/ui/src/DeliveryDatePicker.tsx` lines 219-223 / 206-217), which is
   how the modal closes and how the `closing → closed` D1 chain unmounts the
   dialog. Dropping the duration to `0s` (or removing `animation` outright) would
   silently break that close chain on engines that suppress `animationend` for
   zero-duration animations. The fix must give "no perceived motion" without
   killing the event.

No existing approved spec covers a tightening of the reduced-motion fallback for
this component. Spec 001 (delivery date picker) defines the original behaviour
but treats reduced-motion only at a stub level.

# Scope

Two edits to a single constant in a single file. Nothing else moves.

- **File:** `packages/ui/src/theme/styles.ts`
- **Constant:** `DELIVERY_PICKER_CSS`
- **Change 1 — extend the media-query selector list:** the
  `@media (prefers-reduced-motion: reduce)` block (currently lines 34-37) must
  also target:
  - `.sdp-backdrop`
  - `.sdp-backdrop[data-state="closing"]`
  in addition to the already-listed `.sdp-modal` and
  `.sdp-modal[data-state="closing"]`.
- **Change 2 — drop reduced durations to ~1ms for all four selectors:** modal in,
  modal out, backdrop in, backdrop out all run at `1ms` under reduced motion
  (keeping the `ease-out` / `ease-in` timing functions and the existing
  `sdp-modal-in`, `sdp-modal-out`, `sdp-fade-in`, `sdp-fade-out` keyframe names
  — those keyframes are not edited).

The shipped reduced-motion block, after the change, lists all four selectors
with `1ms` durations.

Files **not** touched by this spec:
- `packages/ui/src/DeliveryDatePicker.tsx` — no JS edits at all.
- `packages/ui/src/theme/tokens.ts` — no token edits.
- Any `apps/web` consumer — they see no API change.

No analytics events are added or modified by this spec. The delivery picker is
a `packages/ui` primitive; analytics for delivery-day selection is owned by its
host (the wizard funnel, spec 010) and is unaffected by a CSS-only motion tweak.

# Contract impact

None.

- `schema.graphql`: untouched.
- `packages/domain`: untouched.
- `packages/ui` public surface (`DeliveryDatePicker` props, `DeliveryLabels`,
  `DeliveryTheme`, exports from `packages/ui/src/index.ts`): untouched.
- No new dependencies. No new exports. No new tokens.

This is a CSS-string edit confined to one private constant inside the package.

# Out of scope

- **Default (no-preference) durations.** The 180ms backdrop and 180ms modal
  enter/exit timings used outside the media query stay exactly as they are.
- **JS / state-machine changes.** `requestClose`, `finishClose`,
  `handleAnimationEnd`, and the `closeTimer.current` 320ms safety net
  (`packages/ui/src/DeliveryDatePicker.tsx` lines 190-223) are not touched.
- **Removing the animations.** We do not switch to `animation: none` for
  reduced-motion users — the `animationend` event must still fire to drive the
  close chain. A 1ms duration keeps the event contract intact while making
  motion imperceptible.
- **Keyframe edits.** The `sdp-modal-in`, `sdp-modal-out`, `sdp-fade-in`,
  `sdp-fade-out` `@keyframes` blocks (lines 12-21) are not touched.
- **Focus ring / `:focus-visible` rules** (lines 29-32) are not touched.
- **Other components.** No other animations in `packages/ui` are audited or
  tightened in this spec.

# Acceptance criteria

- [ ] `yarn type-check` green (0 errors / 0 warnings).
- [ ] `yarn lint` green.
- [ ] The `@media (prefers-reduced-motion: reduce)` block in
      `packages/ui/src/theme/styles.ts` lists all four selectors:
      `.sdp-modal`, `.sdp-modal[data-state="closing"]`, `.sdp-backdrop`,
      `.sdp-backdrop[data-state="closing"]`.
- [ ] Each of those four rules uses `animation-duration: 1ms` (or `0.01s` —
      pick one and use it consistently) while keeping the existing keyframe
      name and timing function.
- [ ] Manual DevTools check: with "Emulate CSS prefers-reduced-motion: reduce"
      enabled, open and close the picker — no perceptible movement on either
      backdrop or modal, but the modal still unmounts (i.e. the
      `closing → closed` transition completes within one frame).
- [ ] **Critical regression check — the D1 close chain.** Under emulated
      reduced motion, clicking **Confirm** still fires the modal's
      `animationend`, still calls `finishClose`, still invokes `onConfirm` with
      the chosen ISO date, and the dialog unmounts. Same check for **Cancel**,
      **Escape**, and **backdrop click**. This is the single hardest test and
      the primary regression risk.
- [ ] **Spec 024 dependency.** The interaction test pack defined by spec 024
      (delivery picker close-chain tests) continues to pass with its
      `matchMedia` mock set to return `matches: true` for
      `(prefers-reduced-motion: reduce)`. This is the automated mirror of the
      manual check above and is the recommended way to lock the behaviour. If
      spec 024 is not yet approved when this spec is implemented, the manual
      DevTools checks above are mandatory and spec 024 must add the
      matchMedia-reduced variant when it lands.

# Analytics

None. This is a CSS-only a11y polish on a presentational component. No funnel
events fire from `packages/ui/src/DeliveryDatePicker.tsx` directly — funnel
instrumentation lives in the wizard host (spec 010 / spec 009), which is
unchanged.
