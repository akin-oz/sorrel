---
spec: 020
title: Funnel form validation — per-step rules, inline errors, gated Continue
status: proposed
approved: yes
tier: 1
owner: apps/web · packages/domain
---

# Problem / gap

Validation is ad-hoc. PROFILE arm-A fires `field_error` on blur (spec 014) and EMAIL validates
server-side (spec 013), but there is no consistent per-step validation: the "Continue" button
is always enabled, a user can advance with an empty name, no recipe, or a missing delivery
date, and there are no inline error messages. The funnel should not let a step complete while
it is invalid.

# Scope

## Validation rules (pure, testable)

A pure `stepValidity(step, state)` helper — no React, unit-tested — returning `{ valid,
errors }` per step:

- **CATS** — always valid (count clamped 1–4).
- **PROFILE** — each cat needs a non-empty `name`; arm A also needs non-empty age + weight
  (arm B selects carry defaults). Field-level errors keyed by field.
- **RECIPES** — at least one recipe selected.
- **DELIVERY** — a delivery date chosen (the picker pre-selects the earliest; invalid only if
  cleared).
- **PLAN** — a frequency chosen (defaults on entry; guard anyway).
- **EMAIL** — a syntactically valid email (mirror the server-side rule from spec 013 so client
  and server agree).
- **SUMMARY** — valid when the funnel is complete (all prior steps valid).

Live where it belongs: pure step rules in `apps/web` funnel logic; the **email-format** check
shared with the server action (one rule, not two). Pricing/portion stay in `packages/domain`.

## Wiring

- **Gate Continue**: `WizardChrome`'s Continue/Confirm is `disabled` (with `aria-disabled` +
  reason) until `stepValidity(currentStep, state).valid`.
- **Inline errors**: each step's invalid fields render an accessible inline message
  (`aria-describedby`, `aria-invalid`), shown after interaction (blur/submit), not on first
  paint.
- **Analytics**: invalid fields fire `field_error` (step, field, error) via the spec-009
  contract — extend the existing PROFILE pattern to the other steps.

# Contract impact

None. No schema/mutation changes; the email rule is shared client/server.

# Out of scope

- Desktop layout / nav parity — spec 019.
- The App\* UI layer (018) — error states should use whatever input components exist when this
  lands (raw MUI now, `AppField` after 018).

# New dependencies

None.

# Acceptance criteria

- [ ] `stepValidity` is pure + unit-tested for every step (valid + each invalid case)
- [ ] Continue/Confirm is disabled until the current step is valid, with an accessible reason
- [ ] Invalid fields show inline, accessible errors after interaction; not on first paint
- [ ] `field_error` fires for each step's invalid fields (spec-009 contract)
- [ ] Email format rule is shared by the client check and the EMAIL server action (no divergence)
- [ ] `yarn type-check` + `yarn lint` + `next build` green; new + existing tests pass
- [ ] No real-brand names/assets

# Analytics

`field_error` (`step`, `field`, `error`) on each invalid field — the friction signal the
funnel thesis instruments.
