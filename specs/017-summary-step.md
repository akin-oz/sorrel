---
spec: 017
title: SUMMARY step — review the assembled plan + confirm
status: proposed
approved: yes
tier: 1
owner: apps/web
---

# Problem / gap

SUMMARY (`/wizard/summary`, the funnel's **last** step) is a stub: it renders the heading
("Your first box") with no body. After assembling cats, recipes, a delivery day, a plan and
an email, the user reaches a dead end — nothing shows what they built and there's no way to
finish. With CATS (016) done, this is the last incomplete funnel step.

No approved spec covers it. Spec 010 scoped per-step forms to "later specs"; 013/014/016
covered PLAN/EMAIL/PROFILE/CATS. This closes the funnel.

# Scope

- **`apps/web/app/[locale]/wizard/SummaryForm.tsx`** (new, `"use client"`): a read-only
  review of the draft, then a confirm affordance.
  - Reads the server draft via `useQuery(FunnelDraftByIdDocument, { id: draftId })` (the
    Apollo write-path from 013) so the **price/plan shown is the server's**, plus client
    state for the rest (cat count, recipe slugs, delivery date, frequency, email).
  - Rows: number of cats, chosen recipes, delivery date (localised via `Intl`), frequency,
    per-box + first-box price (from `plan.pricing`), email.
  - **Confirm**: the existing last-step button (`Wizard.confirm`, "Confirm plan") in
    `WizardChrome` drives it; on confirm, show an inline success state (no navigation —
    this is the funnel's end). A demo confirmation, not a real checkout.
- **`apps/web/app/[locale]/wizard/steps/index.tsx`**: `SummaryStep` renders `<SummaryForm />`.
- **`WizardChrome`**: ensure the last step's confirm click fires `step_completed` for
  SUMMARY and surfaces the success state (reuse existing nav; no new mutation).
- **`apps/web/messages/{en,de}.json`**: a `Summary` namespace (row labels + the success line).

# Contract impact

None. Reads the existing `FunnelDraft` (incl. `plan`) added in 013; no new schema field, no
new mutation, no new dependency. Confirmation is a client success state.

# Out of scope

- **Stripe / real checkout / payment** — Tier-3, separate spec.
- A `confirmSubscription` mutation or transactional email — not in the schema; not added here.
- Editing from the summary (the back nav already allows revisiting steps).

# Acceptance criteria

- [ ] `yarn type-check` + `yarn lint` green; `next build` green
- [ ] `/wizard/summary` (en + de) renders the review from collected state + the server plan price
- [ ] Confirm shows a success state; `step_completed` fires with `step: "SUMMARY"`
- [ ] Graceful when the draft/plan is missing (no crash — show what's known)
- [ ] Accessibility: review is a semantic list; confirm is keyboard-operable with clear status
- [ ] No real-brand names/assets

# Analytics

`funnel_step_viewed` (`step: SUMMARY`, `variant`) on view; `step_completed` (`step: SUMMARY`,
`variant`) on confirm — the funnel-completion signal.
