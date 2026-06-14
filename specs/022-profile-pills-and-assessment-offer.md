---
spec: 022
title: PROFILE toggle-pill control + exit-intent assessment-preview offer
status: proposed
approved: yes
tier: 1
owner: apps/web · packages/ui
---

> Numbering note: the highest committed spec is 020. A 021 was authored then
> **rejected and deleted**; to avoid a collision with that ghost, this is **022**.

# Problem / gap

Two Tier-1 conversion changes on the core 39→65 lever and its recovery surface, both
requested by the owner. Today's implementations are credible-but-weak in two places:

1. **The PROFILE A/B control is a strawman.** Per spec 014, the experiment is **variant A
   (control) = free-text inputs** (`ProfileForm.tsx` renders age/weight as free-text
   `AppField`s) vs **variant B (test) = autocomplete selects with smart defaults**. Free-text
   age/weight is an obvious loser — it inflates the lift and makes the test un-credible. The
   owner wants the control to be a _real_ alternative: **inline toggle pills** showing every
   option, so the A/B measures a genuine UX question (all-options-visible vs
   dropdown-with-defaults) rather than friction-vs-no-friction.

2. **The exit-intent modal is pure reassurance.** `ExitIntentModal.tsx` (spec 010) leads with
   "Leaving so soon?" + "We've saved your progress…" — progress-saved comfort, no reason to
   come back. The owner wants a **value-before-the-sale** hook: finishing the funnel earns a
   **free, no-commitment nutrition assessment / vet-formulated plan preview**. The recovery
   copy should lead with that offer (and personalise with the cat's name when known).

This supersedes the **control arm only** of spec 014's PROFILE A/B (variant B is untouched) and
extends spec 010's modal copy. No schema, no domain, no event-contract change.

# Scope

## Change 1 — PROFILE variant A becomes toggle pills

**File:** `apps/web/app/[locale]/wizard/ProfileForm.tsx`

- **Name stays free-text in both arms** — a name cannot be a pill. The existing `AppField`
  for `name` (with its `field_error` blur + inline `helperText`) is unchanged in both A and B.
- **Variant A renders `age` + `weight` as single-select pill groups** instead of the two
  free-text `AppField`s. Options reuse the existing constants already in the file
  (`AGE_OPTIONS = ["kitten","young","adult","senior"]`, `WEIGHT_OPTIONS = ["s","m","l","xl"]`)
  and the existing i18n labels `Profile.ageOptions.*` / `Profile.weightOptions.*`. **Weight
  keeps its concrete kg-bucket labels** (`"Under 4 kg"` / `"4–5 kg"` / `"5–6 kg"` / `"Over 6 kg"`),
  **text-only, no images**. T-shirt sizing (XS/S/M/L) and an illustrated body-condition selector
  were both considered and **rejected** — t-shirt sizes read as vague for a cat, and the only
  body-condition art on hand is traced from a real brand's chart (the no-real-brand-assets rule).
  Selecting a pill dispatches the same `SET_CAT` action already used (`{ type: "SET_CAT",
cat: { age } }` / `{ weight }`), so funnel state, `stepValidity("PROFILE", …)` (spec 020),
  and the plan all see identical values to today.
- **Variant B (autocomplete selects + `DEFAULT_AGE`/`DEFAULT_WEIGHT` seeding via the existing
  `useEffect`) is UNCHANGED.** The A/B now contrasts pills (all options visible) vs
  dropdown-with-defaults.
- The variant-pending skeleton path (`if (!variant)`) is unchanged.

**App\* layer (packages/ui, spec 018) — DECIDED: keep the togglebutton pattern.** Add a
**`pills` layout** to `AppToggleGroup` (`packages/ui/src/app/components.tsx`, which already wraps
MUI `ToggleButtonGroup exclusive` with `layout: "segmented" | "cards"`) — rounded, wrapping,
content-width (not full-width), single-select — reusing the existing exclusive-select plumbing
and `AppToggleOption`, consistent with the CATS count selector. A dedicated `AppRadioGroup` (true
`role="radiogroup"`) was considered and **set aside** to keep the established toggle pattern.

**A11y:** the group must carry an accessible group label (`aria-label`/labelled-by tied to the
`Profile.age` / `Profile.weight` labels) and arrow-key selection must read acceptably. This is the
toggle-button pattern already used for the CATS count selector — not a true radio group — accepted
as the consistent choice across the funnel's selectors.

**`field_error` semantics — DECISION FOR REVIEWER.** Today arm A fires
`field_error{ step:"PROFILE", field, error:"required" }` on empty free-text blur (`blur()` in
`ProfileForm.tsx`). Pills have no free-text "leave-empty-on-blur" gesture, so define the new
trigger:

- **(a)** Fire `field_error` for an unselected pill group **when the user attempts Continue**
  while PROFILE is invalid (leans on the existing spec-020 `stepValidity` gate, which already
  flags `age`/`weight` as `"required"`).
- **(b)** Drop per-field error firing for the pills entirely and rely only on the spec-020
  step-validity gate (disabled Continue) for the signal.

The typed `FunnelEvent` contract is **unchanged** either way — `field`/`error` props stay
valid (`error: "required"`). `name`'s blur-based `field_error` is unchanged in both arms.

**Pre-selection — DECISION FOR REVIEWER (the single biggest call).** Should variant A's pills
**pre-select a default** (mirroring B's `DEFAULT_AGE`/`DEFAULT_WEIGHT`, making PROFILE valid on
entry — so the A/B is purely a pills-vs-dropdown _UI_ test), or **start unselected** (forcing an
explicit choice — testing active engagement and preserving a meaningful contrast with B's
_passive_ defaults)? **Recommendation: start unselected** — active choice is the pills'
distinctive value, and it keeps A and B genuinely different. The reviewer confirms.

## Change 2 — Exit-intent assessment-preview offer

**Files:** `apps/web/app/[locale]/wizard/ExitIntentModal.tsx` + the `ExitIntent` i18n
namespace in `apps/web/messages/en.json` and `apps/web/messages/de.json`.

- Reframe the modal copy to **lead with the offer**: finishing the funnel earns a **free
  nutrition assessment / vet-formulated plan preview, no commitment**. Keep the progress-saved
  reassurance as a secondary line. New/revised keys under `ExitIntent` (e.g. an `offer` line);
  the title may stay or soften. All copy added to **both** en and de.
- **Personalise with the cat's name when known** — the funnel has it from PROFILE
  (`state.cats[0].name`). When absent, fall back to neutral copy (e.g. "your cat"); no ghost
  state, no empty interpolation. The modal currently takes only `open`/`onRecover`/`onLeave`
  props — the cat name must be passed in (new optional prop) or read where the modal is
  mounted; spec the chosen plumbing, do not invent a store.
- **Keep going / Leave for now actions are unchanged in behaviour** (the existing `AppButton`s
  wired to `onRecover` / `onLeave`).

**CTA scope — DECISION FOR REVIEWER.** Is "Keep going" purely the existing continue-in-funnel
action (**recommended — copy-only reframing; the offer is messaging, and the primary button
keeps them progressing toward the assessment**), or should a second CTA jump straight to the
PLAN/assessment-preview step? Recommendation: **copy-only**, no new navigation target, no new
button.

# Contract impact

**None.** No `schema.graphql` change, no `packages/domain` change. The typed `FunnelEvent`
contract (spec 009, `@sorrel/analytics`) is untouched — `field_error` keeps its existing
`step`/`field`/`error` props, and the exit-intent events keep their `step` prop. No generated
types change. If the chosen `field_error` decision were to need a new `error` code, that would
be a contract change and must be raised separately — the recommended options use only the
existing `"required"` code, so none is needed.

# Out of scope

- **Re-seeding / re-narrating the demo (flagged, not done here).** The seed model
  (`apps/web/scripts/seed-funnel.ts`, `RETENTION.A = [0.82, 0.55, …]`) and the
  README/insights framing assume **A = free-text friction** (low PROFILE→RECIPES + extra A
  `field_error`s). A pills control is lower-friction, so the expected A/B gap shrinks and the
  story shifts from "remove free-text friction" to "active-choice pills vs autocomplete
  defaults." The seed `RETENTION` curve, the `field_error` volume in any Mixpanel/PostHog
  seeds, the README/analytics framing, and the re-seeded demo dashboards **should be updated
  after this lands** — tracked as a follow-up spec, not built here, so this change ships
  unbroken on its own.
- Variant B (autocomplete + smart defaults) — explicitly unchanged.
- The `useVariant` source / bucketing (PostHog-or-local) — unchanged; the offline deterministic
  split must keep working.
- Spec 020's `stepValidity` rules and the Continue gate — reused, not redefined.
- Any new exit-intent navigation target or second CTA (unless the reviewer picks that option).
- New analytics events, schema, domain logic, or external dependencies.

# New dependencies

None.

# Acceptance criteria

- [ ] PROFILE **variant A** renders `age` + `weight` as single-select pill groups (reusing
      `AGE_OPTIONS`/`WEIGHT_OPTIONS` + `Profile.ageOptions.*`/`Profile.weightOptions.*`);
      `name` stays a free-text `AppField` in **both** arms
- [ ] PROFILE **variant B** (autocomplete selects + default seeding) is unchanged
- [ ] The pill control lives in `packages/ui` as a **`pills` layout on `AppToggleGroup`**
      (togglebutton pattern); `apps/web` uses **no `sx`, no `@mui`** (spec 018)
- [ ] Weight pills keep the concrete kg-bucket labels (text-only, no images)
- [ ] Selecting a pill dispatches `SET_CAT`; `stepValidity("PROFILE", …)` and the plan see the
      same values as the free-text/select arms did
- [ ] The pill group exposes an accessible group label and keyboard selection
- [ ] `field_error` fires per the reviewer's chosen trigger (Continue-attempt-while-invalid or
      step-gate-only); the typed `FunnelEvent` contract is unchanged
- [ ] Pre-selection behaviour matches the reviewer's decision (recommended: unselected)
- [ ] Exit-intent modal leads with the free-assessment / plan-preview offer, keeps the
      progress-saved reassurance, and personalises with the cat's name when present (neutral
      fallback when absent — no empty interpolation)
- [ ] New/revised `ExitIntent` copy added to **both** `en.json` and `de.json`
- [ ] `exit_intent_shown` / `exit_intent_recovered` still fire unchanged (recovery still
      measurable)
- [ ] Offline / no-flag path still yields a deterministic A/B split (demo stays splittable)
- [ ] `yarn type-check` + `yarn lint` + `next build` green; existing tests stay green; the
      pure validation/reducer tests still pass
- [ ] Pixel/behaviour verified against the design tone (PROFILE variant A pills, en + de; the
      reframed modal, en + de)
- [ ] No real-brand names/assets

# Analytics

No new event types. `field_error` (`step:"PROFILE"`, `field`, `error:"required"`) fires on the
reviewer-chosen trigger for the pill groups, and unchanged on `name` blur in both arms.
`funnel_step_viewed` / `step_completed` (with `variant`) and the exit-intent
`exit_intent_shown` / `exit_intent_recovered` (with `step`) are unchanged — the modal reframing
strengthens recovery _copy_, not its instrumentation. All emission stays on the spec-009 typed
`createTracker`; zero ad-hoc events.
