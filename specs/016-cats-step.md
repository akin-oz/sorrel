---
spec: 016
title: CATS step — cat-count selector + typed state
status: proposed
approved: yes
tier: 1
owner: apps/web
---

# Problem / gap

The CATS step (`/wizard/cats`, the **first** funnel step) is the only remaining stub: it
renders the `StepShell` heading ("How many cats are we feeding?") with **no input**. A user
who starts the funnel sees a title and has nothing to do — the funnel can't begin, and the
roadmap's "all seven steps" claim has a hole at step one.

No approved spec covers this. Spec 010 (wizard shell) deliberately scoped the per-step
**forms** to "later specs" — PROFILE landed in 014, PLAN/EMAIL in 013 — and the CATS input
was never given one. This spec closes that gap.

# Scope

- **`apps/web/app/[locale]/wizard/CatsForm.tsx`** (new, `"use client"`): a cat-count
  selector — an MUI `ToggleButtonGroup` of 1 / 2 / 3 / 4, reading the current count from
  `state.cats.length` and dispatching `SET_CAT_COUNT`. Defaults to 1 on first entry (so the
  page always has a valid selection). Localised via a new `Cats` message namespace.
- **`apps/web/app/[locale]/wizard/state.ts`**: add a `SET_CAT_COUNT` action that resizes
  `state.cats` to N, **preserving** existing drafts (truncate when fewer, pad with
  `{ name: "" }` when more), clamped to 1–4. Pure — unit-tested in `state.test.ts`.
- **`apps/web/app/[locale]/wizard/steps/index.tsx`**: `CatsStep` renders `<CatsForm />`.
- **`apps/web/messages/{en,de}.json`**: a `Cats` namespace (selector legend + the
  `{count, plural, …}` option labels).
- **Instrumentation**: `funnel_step_viewed` already fires on view (FunnelProvider) and
  `step_completed` on Continue (WizardChrome, carrying `variant`) — CATS inherits both with
  no new wiring.

# Contract impact

None. No `schema.graphql` or `packages/domain` change. `cats` is already part of
`FunnelState` and maps to the GraphQL `CatInput` through the existing `draft-input` adapter,
so a larger count simply scales the plan (more cats → larger portion/price) via the domain.

# Out of scope

- **Per-cat PROFILE for cats beyond the first.** PROFILE (014) profiles cat 1; the plan
  scales by count using the adapter's weight default for the rest. A multi-cat PROFILE
  (name/age/weight per cat) is a separate follow-up spec.
- No "4+" free-entry, no new dependencies, no schema change.

# Acceptance criteria

- [ ] `yarn type-check` + `yarn lint` green (0 errors/warnings); `next build` green
- [ ] `SET_CAT_COUNT` reducer unit-tested: resize preserves existing drafts and clamps to 1–4
- [ ] `/wizard/cats` (en + de) renders a working count selector; **Continue** advances to PROFILE
- [ ] `step_completed` fires with `step: "CATS"` (and `variant`) on Continue
- [ ] Accessibility: the toggle group has an accessible name and is keyboard-operable
- [ ] No real-brand names/assets

# Analytics

`funnel_step_viewed` (`step: CATS`, `variant`) on view; `step_completed` (`step: CATS`,
`variant`) on Continue. No `field_error` — the count is always a valid 1–4 selection.
