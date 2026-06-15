---
spec: 046
title: Spec 039 follow-on — hide the chrome CTA on the post-payment SUMMARY success card (today Continue is visible and navigates back to /wizard/checkout)
approved: yes
tier: 2 # JD coverage — closes a visible terminal-state UX gap from spec 039 / 045
owner: apps/web/app/[locale]/wizard/WizardChrome.tsx · apps/web/cypress/e2e/funnel/happy-path.cy.ts
---

# Problem / gap

Manual walk of the live funnel after spec 045 shipped surfaces a downstream
regression introduced by spec 039: on the non-3DS happy path, payment
succeeds, `CheckoutForm` calls `confirm()` and pushes the user to
`/wizard/summary?paid=1`. `SummaryForm` renders the terminal "You're all
set!" success card (lines 34–48). But the wizard chrome's primary CTA is
still on screen, labelled "Continue", and clicking it navigates the user
**back to `/wizard/checkout`** — a freshly-bootstrapped PaymentElement on
top of an already-paid order. The success state is no longer terminal.

The cause is a stale guard in `apps/web/app/[locale]/wizard/WizardChrome.tsx`
lines 68–70:

```ts
const showCta = currentStep
  ? currentStep !== "CHECKOUT" && !(isLastStep(currentStep) && confirmed)
  : false;
```

The `!(isLastStep(currentStep) && confirmed)` clause was authored when
SUMMARY was the last step — `confirmed` flipped on SUMMARY, so hiding the
CTA on `isLastStep && confirmed` was the right guard. Spec 039 moved
CHECKOUT after SUMMARY and made it the last step, but `confirm()` is now
called from `CheckoutForm` and the post-success navigation (spec 045)
lands the user on SUMMARY — a step that is no longer the last. The guard
never matches: `isLastStep("SUMMARY") === false`, so the CTA renders.

`handleNext` on SUMMARY does not call `confirm()` (already true) — it
follows the non-last-step path: `router.push(\`/wizard/${segmentForStep(nextStep("SUMMARY"))}\`)`,
which is `/wizard/checkout`. The user goes from a terminal success card
back to a payment form for an order they already paid for.

No existing approved spec covers this gap. Spec 039 designed the
SUMMARY → CHECKOUT order and the `confirm()` semantics; spec 045
designed the post-payment navigation to SUMMARY; neither updated the
chrome's `showCta` guard to match.

# Scope

The exact files this spec touches. No file outside these is edited.

## 1. Broaden the chrome CTA guard to track `confirmed` directly

- Edit `apps/web/app/[locale]/wizard/WizardChrome.tsx` lines 68–70: replace
  `!(isLastStep(currentStep) && confirmed)` with `!confirmed`. The full
  guard becomes:

  ```ts
  const showCta = currentStep ? currentStep !== "CHECKOUT" && !confirmed : false;
  ```

  Rationale: `confirmed` is the funnel's terminal flag. Once it flips,
  the success card is the destination — no chrome CTA is ever sensible,
  regardless of which step happens to be mounted at the moment. The
  CHECKOUT-step guard is preserved because that step drives its own
  in-form submit (Stripe PaymentElement) and the chrome CTA would be
  redundant.

- `import { isLastStep, ... }` stays as-is (still used by `handleNext`
  and the CTA label switch).

- Acceptance: a post-payment user on `/${locale}/wizard/summary?paid=1`
  (where `confirmed === true`) sees the success card with **no** chrome
  CTA. Same applies if SUMMARY's existing chrome-driven confirm path
  ever flips `confirmed` on a non-CHECKOUT route (defence in depth).

## 2. Cypress happy-path assertion

- Edit `apps/web/cypress/e2e/funnel/happy-path.cy.ts`: after the
  post-payment URL assertion (added in spec 045), assert that no
  `button` matching `/^Continue$/` exists on the page. Today the spec
  walks past the success card without checking; the regression this
  spec fixes would not be caught by the existing e2e.

  Suggested form:

  ```ts
  cy.location("pathname").should("include", "/wizard/summary");
  cy.contains(/you're all set/i).should("be.visible");
  cy.contains("button", /^Continue$/).should("not.exist");
  ```

# Contract impact

- `schema.graphql`: untouched.
- `packages/domain`: untouched.
- `packages/analytics`: untouched (no event shape change; no new event).
- `packages/ui`: untouched (the AppButton render is governed by the
  consumer's `showCta` flag, not the component).
- No new dependencies. No new GraphQL operations.

# Out of scope

- Reworking the SummaryForm success card (font, copy, layout). The
  terminal state itself is correct; this spec only stops the chrome
  from drawing a CTA over it.
- Adding a "what's next" CTA on the success card (e.g. "Track your box",
  "Back to home"). Spec 045 §Out-of-scope already explicitly defers
  that; this spec preserves the same boundary.
- Reading the `?paid=1` query string in SUMMARY. The chrome reacts to
  `confirmed` alone, mirroring SummaryForm's own derivation.
- Hiding the back button when `confirmed`. Walking back from a paid
  success card to revisit prior steps is harmless (no re-submit path),
  so the cost of the extra logic is not justified by the rare backwards
  navigation case. Optional follow-on if Akın disagrees.

# Acceptance criteria

- [ ] `yarn type-check && yarn lint` — clean (0 warnings, 0 errors).
- [ ] `yarn workspaces run test` — every workspace's jest suite green.
- [ ] `yarn workspace @sorrel/frontend cypress run` — the happy-path
      spec asserts the success card is visible AND no Continue button
      exists on the post-payment SUMMARY route. Identical pass count to
      the pre-spec baseline plus one added assertion line.
- [ ] Manual: walking the funnel with the 4242 card lands on
      `/${locale}/wizard/summary` with the success card visible and no
      Continue button. Attempting to click anywhere that previously
      navigated to `/wizard/checkout` no longer triggers that route.
- [ ] No `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or
      `ignoreDeprecations` added anywhere in the diff.
- [ ] `apps/web/app/[locale]/wizard/WizardChrome.tsx` `showCta` no
      longer references `isLastStep`. A
      `grep -n 'showCta' apps/web/app/[locale]/wizard/WizardChrome.tsx`
      returns the new form: `currentStep !== "CHECKOUT" && !confirmed`.
- [ ] The implementation commit subject(s) include the `Spec: 046`
      trailer (canonical form).

# Analytics

None. No event added, removed, or reshaped. The post-payment
`payment_succeeded` event continues to fire from `CheckoutForm`
unchanged. No new `step_completed` emit is added for the success card,
because the funnel is already terminal by that point and an extra emit
would inflate the conversion denominator.
