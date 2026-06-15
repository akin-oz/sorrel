---
spec: 045
title: Spec 039 follow-on — CHECKOUT success feedback — navigate to SUMMARY on the non-3DS happy path so the success card actually shows (today the user sits on the Stripe form with no signal)
approved: yes
tier: 2 # JD coverage — closes a visible CHECKOUT UX gap from spec 039
owner: apps/web/app/[locale]/wizard/CheckoutForm.tsx · apps/web/app/[locale]/wizard/SummaryForm.tsx · apps/web/cypress/funnel/happy-path.cy.ts
---

# Problem / gap

Manual walk of the live funnel surfaces a CHECKOUT step UX bug introduced by
spec 039: on the **non-3DS** happy path (the demo's primary card,
`4242 4242 4242 4242`), a successful payment produces **no visible signal**.
The user clicks "Pay now", the button briefly shows "Submitting…", the
network resolves, and… they're still on `/wizard/checkout` looking at the
same PaymentElement. The button re-enables, the error message is empty, and
nothing indicates the order went through.

The cause is a missing navigation in the success branch. The flow today
(`apps/web/app/[locale]/wizard/CheckoutForm.tsx` lines 50–76):

```ts
const result = await stripe.confirmPayment({
  elements,
  confirmParams: {
    return_url: `${window.location.origin}/${locale}/wizard/summary?paid=1`,
  },
  redirect: "if_required",
});
// ...
if (result.paymentIntent && result.paymentIntent.status === "succeeded") {
  track({ name: "payment_succeeded", ... });
  confirm();
  // ← no navigation. The user is on /wizard/checkout, never sees SUMMARY's success state.
}
```

`redirect: "if_required"` makes Stripe redirect **only** when the
PaymentMethod needs an external step (3DS, OXXO, etc.). The 4242 test card
does not — Stripe resolves the Promise locally and the code falls through.
`confirm()` flips the FunnelProvider's `confirmed` boolean, which is the
trigger for `SummaryForm.tsx` lines 34–48 to render the success card
(checkmark + `successTitle` + `successBody`) — but only if SUMMARY is the
mounted route. On CHECKOUT, nothing observes the flip.

The 3DS path is correct: Stripe redirects to the `return_url`
(`/wizard/summary?paid=1`), the SUMMARY page mounts, `confirmed` is true,
the success card shows. The non-3DS path needs to match.

A secondary, smaller gap: during the brief window between
`stripe.confirmPayment` resolving and the navigation taking effect, the
form is in a `pending=false, errorMessage=null, paymentIntent=succeeded`
state — visually identical to "you haven't paid yet." For a demo a tight
"Payment received — finishing your subscription…" beat before navigating
is the polished move and prevents accidental double-clicks if navigation
is even slightly delayed.

No existing approved spec covers either gap. Spec 039 designed
SUMMARY → CHECKOUT and the `confirm()` → SUMMARY-success-state wiring,
but missed that `confirm()` alone on CHECKOUT renders no UI.

# Scope

The exact files this spec touches. No file outside these is edited.

## 1. Navigate to SUMMARY on non-3DS payment success

- Edit `apps/web/app/[locale]/wizard/CheckoutForm.tsx`:
  - Import `useRouter` from `next/navigation` (the locale-aware version
    already used elsewhere in the wizard is exported from
    `apps/web/i18n/navigation.ts` — use that for locale parity).
  - In `PaymentBody`, after the existing `confirm()` call in the
    `result.paymentIntent.status === "succeeded"` branch, call
    `router.push(\`/wizard/summary?paid=1\`)`. The locale-aware router
prepends `/${locale}` automatically.
  - The 3DS branch is untouched — Stripe's full-page redirect to
    `return_url` is already correct and lands on the same URL.
- Acceptance: the non-3DS happy path lands on `/${locale}/wizard/summary`
  with `?paid=1` after a successful Stripe confirm, and SUMMARY renders
  the existing success card (`SummaryForm.tsx` lines 34–48).

## 2. Brief "Payment received" interim state

- Edit `apps/web/app/[locale]/wizard/CheckoutForm.tsx` `PaymentBody`:
  - Add a third UI state `succeeded` alongside the existing pending /
    error states. State variable: `const [phase, setPhase] = useState<"idle"
| "pending" | "succeeded">("idle")`.
  - On `submit start`: `setPhase("pending")` (replaces the current
    `setPending(true)`).
  - On `result.error`: `setPhase("idle")` + the existing
    `setErrorMessage`.
  - On `result.paymentIntent.status === "succeeded"`: `setPhase("succeeded")`,
    track + `confirm()`, **then** `router.push(\`/wizard/summary?paid=1\`)`.
  - When `phase === "succeeded"`, the form replaces the PaymentElement
    with a small success card: a checkmark + the new `Checkout.success`
    i18n string ("Payment received — finishing your subscription…").
    No "Pay" button (it would be a double-submit hazard).
  - The router push fires immediately; Next's client-side navigation is
    fast enough that the interim state is normally a flash, but it covers
    any network or hydration delay so the user never sees the
    "post-success, pre-navigation" zero-feedback gap.

## 3. i18n strings

- Edit `apps/web/messages/en.json` and `apps/web/messages/de.json`
  `Checkout` namespace: add one new key
  `success`: "Payment received — finishing your subscription…" (de:
  "Zahlung erhalten — wir richten dein Abo ein…"). Used by the new
  `phase === "succeeded"` card above.

## 4. Cypress happy-path assertion

- Edit `apps/web/cypress/funnel/happy-path.cy.ts`: after the 4242 card
  submission, assert the URL changes to `/en/wizard/summary?paid=1` and
  the success card is visible
  (`cy.contains(/successTitle|order received/i)` or whatever the en
  translation actually renders). Today the spec asserts the analytics
  queue's `payment_succeeded` event but not the navigation, so the bug
  this spec fixes would not be caught by the existing e2e.

# Contract impact

- `schema.graphql`: untouched.
- `packages/domain`: untouched.
- `packages/analytics`: untouched (the `payment_succeeded` event already
  exists; this spec only changes what happens _after_ it fires).
- `packages/ui`: untouched.
- No new dependencies. No new GraphQL operations. No new typed analytics
  events.

# Out of scope

- Reworking SUMMARY's success card (it already exists in
  `SummaryForm.tsx` lines 34–48; that's the destination, not the subject).
- Reading the `?paid=1` query string in SUMMARY. Today `SummaryForm.tsx`
  derives the success state from `confirmed` alone, which is correct: the
  user's intent (paid) is the signal, not the URL. The `?paid=1` is purely
  Stripe's 3DS-redirect convention for matching the `return_url`. Leaving
  the query unread is intentional.
- Server-side capture of the `payment_succeeded` event. Spec 039 left
  this for a follow-on; not this one.
- Anything about the `funnel_abandoned` event on CHECKOUT — that's
  separate routing semantics.
- Adding a "what's next" screen with delivery date confirmation, receipt,
  etc. The SUMMARY success card is the demo's terminal state.

# Acceptance criteria

- [ ] `yarn type-check && yarn lint && yarn format:check` — clean (0
      warnings, 0 errors).
- [ ] `yarn workspaces run test` — every workspace's jest suite green.
- [ ] `yarn workspace @sorrel/frontend cypress run` — the happy-path
      spec asserts the URL ends with `/en/wizard/summary?paid=1` and the
      success card content is on screen. Identical pass count to the
      pre-spec baseline plus zero or one added assertion lines.
- [ ] Manual: walking the funnel with the 4242 card lands on
      `/en/wizard/summary` with the success card visible within 1s of
      clicking Pay. No "stuck on CHECKOUT" state.
- [ ] `apps/web/messages/en.json` and `de.json` both contain
      `Checkout.success`.
- [ ] `apps/web/app/[locale]/wizard/CheckoutForm.tsx` no longer has a
      `payment_succeeded` branch that ends without a navigation. A
      `grep -nE 'confirm\\(\\);?\\s*\\}' apps/web/app/[locale]/wizard/CheckoutForm.tsx`
      returns nothing in the success branch (i.e. `confirm()` is
      followed by `router.push`, not by a closing brace).
- [ ] No `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or
      `ignoreDeprecations` added anywhere in the diff.
- [ ] The implementation commit subject(s) include the `Spec: 045`
      trailer (canonical form).

# Analytics

None. The `payment_succeeded` event still fires from the same code path
with the same shape; only what happens _after_ the emit changes. The
existing variant carriage (spec 043) is preserved because the
`router.push` is appended **after** the `track(...)` call.
