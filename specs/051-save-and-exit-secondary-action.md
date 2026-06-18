---
spec: 051
title: Add a Save & exit secondary action to the wizard chrome
status: proposed
approved: yes
tier: 2 # JD coverage — funnel completeness / intentional-exit affordance
owner: apps/web · packages/analytics
---

# Problem / gap

The spec-018 design handoff shows a muted, secondary **"Save & exit"** link directly
below the primary Continue CTA in the wizard form column. `WizardChrome.tsx` renders
the Continue button (`AppButton variant="contained"`) and, when the step is invalid,
the `incomplete` helper text — but it renders **no Save & exit affordance at all**.

The draft is already persisted continuously by `useDraftAutosave` (spec 013), so the
data side is solved. What is missing is the _intentional-exit_ affordance: a way for a
user who wants to stop now (knowing their progress is saved) to leave deliberately,
and for us to attribute that exit distinctly from the passive page-close drop-off.

Today the only abandonment signal is the passive `pagehide` handler in
`FunnelProvider.tsx` (lines 156–169), which fires `funnel_abandoned` with no reason.
A deliberate "Save & exit" click and an accidental tab-close currently look identical
in analytics. No existing approved spec covers an intentional-exit control or a reason
discriminator on `funnel_abandoned`.

# Scope

Exact files, components, and events touched:

- **`apps/web/app/[locale]/wizard/WizardChrome.tsx`**
  - In the form column, inside the existing `AppStack` that wraps the Continue CTA
    (lines ~204–226), render an additional `AppButton variant="text"` labelled from
    `t("saveAndExit")`, placed **below** the Continue button (and below the
    `incomplete` helper text).
  - Gate its visibility with a new derived boolean — call it `showSaveExit` — that is
    `true` only when `currentStep` is set and is **neither `"CHECKOUT"` nor
    `"SUMMARY"`**. This is intentionally narrower than the existing `showCta`
    (`showCta` is also false on CHECKOUT, but Save & exit must additionally be hidden
    on SUMMARY even though `showCta` already hides the CTA there via `!confirmed`).
    Note SUMMARY is `isLastStep`, so the Save & exit gate must key on the step
    identity, not on `showCta`.
  - Add a `handleSaveExit` callback (mirroring the `handleNext`/`handleBack`
    `useCallback` style already in the file) that:
    1. returns early if `!currentStep`;
    2. fires `track({ name: "funnel_abandoned", step: currentStep, reason: "save_exit", variant: variant ?? undefined })`;
    3. navigates to the locale root via the existing `router.push("/")` (the
       `useRouter` import from `../../../i18n/navigation` is locale-aware, so `"/"`
       resolves to `/${locale}` — confirm this matches how the Sorrel logo `Link
href="/"` already behaves in this same file). If the locale-aware router does
       **not** prefix the locale, use `` `/${locale}` `` instead — but do not invent a
       new navigation helper; reuse the `useRouter`/`Link` already imported here.
  - No new autosave call on click — the draft is already persisted by
    `useDraftAutosave`; `handleSaveExit` must not invoke `save`/`saveFunnelDraft`.

- **`packages/analytics/src/events.ts`**
  - Extend the `FunnelAbandoned` interface (lines 37–43) with an **optional**
    `reason` field typed as a string-literal union. It currently has **no** `reason`
    field, so this is a net-new property:
    ```ts
    /** Why the user left. Absent on the passive pagehide path; "save_exit" on the
     *  deliberate Save & exit click (spec 051). */
    reason?: "save_exit";
    ```
    Keeping it optional preserves every existing emit site (the `pagehide` handler in
    `FunnelProvider.tsx`, plus the three seed scripts and the unit tests below) without
    a code change.

- **`apps/web/messages/en.json`** — add `"saveAndExit": "Save & exit"` to the
  `"Wizard"` object (currently lines 7–15).
- **`apps/web/messages/de.json`** — add `"saveAndExit": "Speichern & beenden"` to the
  `"Wizard"` object.

Analytics event touched: **`funnel_abandoned`** (gains an optional `reason`).

# Contract impact

- **`schema.graphql`:** none. No query/mutation/field changes.
- **`packages/domain`:** none. No pricing/portion/plan logic touched.
- **`packages/analytics`:** additive only — one new **optional** literal-union field on
  an existing event interface. Because it is optional, the derived `FunnelEvent` union
  and `FunnelEventName` are unchanged in shape, and no existing emit site breaks. The
  `events.test.ts` exhaustiveness switch (case `"funnel_abandoned"`, line 18) continues
  to compile unchanged.

# Out of scope

- The **exit-intent modal** (`ExitIntentModal` / `useExitIntent` / `ExitIntentController`)
  and its "Leave for now" path — that is a separate, involuntary-trigger mechanism with
  its own `exit_intent_shown` / `exit_intent_recovered` events. This spec must not merge,
  reuse, or alter that flow. "Save & exit" is a deliberate, always-available link in the
  chrome; "Leave anyway" is a dismissal inside a popup.
- The passive `pagehide` `funnel_abandoned` emit in `FunnelProvider.tsx` — it stays as
  is and continues to fire **without** a `reason`. Do not add `reason: "save_exit"` there.
- Any new `reason` values beyond `"save_exit"` (e.g. timeout, error). The union stays a
  single literal until a future spec needs more.
- Any confirmation dialog / "are you sure?" interstitial before exiting. The click
  navigates away directly; the draft is already safe.
- Any change to where the draft is stored or how resume works (spec 013 owns that).
- Mobile vs desktop layout differences for the link beyond what `AppButton fullWidth`
  and the existing `AppStack` placement already provide.

# Acceptance criteria

- [ ] `yarn type-check` green (0 errors/warnings) across the monorepo.
- [ ] `yarn lint` clean.
- [ ] `packages/analytics` unit tests pass; a test asserts a `funnel_abandoned` emit
      carrying `reason: "save_exit"` type-checks and round-trips through the sink, and
      that an emit _without_ `reason` still type-checks (back-compat).
- [ ] The Save & exit `AppButton variant="text"` renders below Continue on the CATS,
      PROFILE, RECIPES, DELIVERY, and PLAN steps.
- [ ] It does **not** render on CHECKOUT (payment in progress) or SUMMARY (complete).
- [ ] Clicking it fires exactly one `funnel_abandoned` with
      `{ step: <currentStep>, reason: "save_exit", variant }` and then navigates to the
      locale root.
- [ ] No `saveFunnelDraft` mutation is triggered by the click (verified via the call
      not appearing beyond the existing autosave debounce).
- [ ] Accessibility: the link meets the 44px minimum touch target — it inherits
      `appTokens.control.minHeight` (44) applied to all `AppButton` sizes in
      `packages/ui/src/app/theme.ts`; no override may shrink it below 44.
- [ ] The exit-intent happy-path Cypress assertion ("no `funnel_abandoned` on the happy
      path", `cypress/e2e/funnel/happy-path.cy.ts:246`) still holds — the happy path does
      not click Save & exit, so it must remain green unchanged.

# Analytics

- **`funnel_abandoned`** — fired on Save & exit click with props:
  - `step`: the current `FunnelStep` (one of CATS, PROFILE, RECIPES, DELIVERY, PLAN —
    never CHECKOUT/SUMMARY, since the link is hidden there).
  - `reason: "save_exit"` — the new discriminator distinguishing this deliberate exit
    from the passive `pagehide` path (which fires the same event with `reason` absent).
  - `variant`: the active A/B bucket (`variant ?? undefined`), carried so deliberate
    exits stay attributable per variant, consistent with every other emit in this file.

No other event types fire as a result of this control. `step_completed`,
`field_error`, and `funnel_step_viewed` are unaffected.
