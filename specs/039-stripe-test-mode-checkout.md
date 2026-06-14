---
spec: 039
title: Stripe test-mode checkout — the funnel's terminal commit leg
approved: yes
tier: 3
owner: apps/web · packages/shared · packages/analytics · schema.graphql
---

# Problem / gap

Stripe test mode has been listed as a Tier-3 closer in `README.md` since the
roadmap audits started flagging it, and no approved spec covers it. Today the
funnel's terminal step is SUMMARY (`apps/web/app/[locale]/wizard/SummaryForm.tsx`);
the chrome's "Confirm plan" button (`WizardChrome.handleNext`, lines 50–58 of
`apps/web/app/[locale]/wizard/WizardChrome.tsx`) calls `confirm()` from
`FunnelProvider` (lines 79–80 of `apps/web/app/[locale]/wizard/FunnelProvider.tsx`),
which flips the local `confirmed` boolean and renders SUMMARY's success state
(lines 34–48 of `SummaryForm.tsx`). There is no payment leg.

Three concrete gaps stay open until this spec lands:

1. **No terminal commit step end-to-end.** A reviewer cannot see what an actual
   pay-and-receipt path looks like, what events fire on it, or how the
   server-trust boundary holds at the moment of conversion. Stripe **test mode**
   (test keys + test cards like `4242 4242 4242 4242`) is the credible
   zero-money-risk way to show that.
2. **No typed-event coverage at the commit boundary.** The spec-009
   `FunnelEvent` discriminated union (`packages/analytics/src/events.ts`)
   currently emits `step_completed` for SUMMARY but has no event for "the user
   pressed pay and the charge succeeded". Today the conversion moment is
   silent — it is the one place in the funnel where wrong is _not_
   un-mergeable.
3. **No demonstrated security posture for secret-key handling.** A reviewer
   has no evidence in the repo that secrets stay server-side, that the
   publishable key is the only client-side surface, and that Stripe's PCI
   scope (test cards never touch our servers) is preserved.

No existing approved spec covers a payment leg. Spec 013 wired the Apollo
write-path + the EMAIL server action; spec 017 shipped the SUMMARY review
and the `confirmed` boolean; neither models a CHECKOUT step. The spec-024
funnel-step structural test (`packages/shared/src/funnel.test.ts`, lines 25–33)
already enforces that the GraphQL `FunnelStep` enum and the
`FUNNEL_STEPS` tuple stay in sync — any new step must land in both at once.

# Scope

The exact files, components, schema types, env keys, and analytics events this
touches. Two architecture decisions (A and B) are called out for Akın to pick at
approval time; this spec does **not** pre-implement either.

## 1. Add `CHECKOUT` to the funnel step enum (additive contract change)

- `schema.graphql`: add `CHECKOUT` to the `FunnelStep` enum block (lines 60–69).
  Placement is **Decision A** below.
- `packages/shared/src/funnel.ts`: add `"CHECKOUT"` to the `FUNNEL_STEPS`
  tuple (lines 12–20), in the position that mirrors the schema change. The
  derived `FunnelStep` union and `isFunnelStep` narrow grow with it.
- `packages/shared/src/funnel.test.ts`: the schema-sync test passes
  automatically (it asserts equality between the SDL block and the tuple).
  The `isFunnelStep` rejection case on line 43 (`expect(isFunnelStep("checkout")).toBe(false)`)
  must be relaxed — `"checkout"` is now a real route segment. The replacement
  rejection uses a still-bogus value (e.g. `"thanks"`).
- `apps/web/app/[locale]/wizard/state.ts`: no code change to `stepFromSegment`
  / `segmentForStep` — they derive from `FUNNEL_STEPS` and pick the new step
  up for free. The `isLastStep` helper (lines 122–123) automatically points
  at the new last step.
- `apps/web/app/[locale]/wizard/steps/index.tsx`: register a `CheckoutStep`
  in `STEP_SCREENS` (lines 149–157) that mounts the new `CheckoutForm` inside
  a `StepShell step="CHECKOUT"`.
- `apps/web/messages/en.json` + `apps/web/messages/de.json`: add the
  `Steps.CHECKOUT.title` + `Steps.CHECKOUT.description` strings and the new
  `Checkout.*` namespace (Pay button label, the "redirecting…" pending copy,
  the failure string, the test-mode-only "use 4242 4242 4242 4242" hint).

**Decision A — order of SUMMARY and CHECKOUT.** The spec author recommends
`… → SUMMARY → CHECKOUT` because SUMMARY is the user's review _before_ commit
and payment is the commit. The `confirm()` call in `WizardChrome.handleNext`
(line 54) then moves out of SUMMARY and into CHECKOUT — `confirm()` only
fires on a successful Stripe confirm, not on the SUMMARY review.

The alternative (`… → CHECKOUT → SUMMARY`) makes SUMMARY a post-payment
receipt; SUMMARY's success-state copy is then the receipt, the `confirmed`
boolean is set _on entering_ SUMMARY, and `WizardChrome.handleNext` does
nothing on SUMMARY. Akın picks at approval time.

## 2. Render the Stripe step

Create `apps/web/app/[locale]/wizard/CheckoutForm.tsx` (new file, `"use client"`)
that:

- Lazily loads Stripe.js via `loadStripe(publishableKey)` from
  `@stripe/stripe-js`. The publishable key is read from
  `process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- Wraps the body in `<Elements stripe={stripePromise} options={{ clientSecret }}>`
  from `@stripe/react-stripe-js`.
- Mounts the Stripe **Payment Element** (`<PaymentElement />`) inside an
  `AppCard tone="paper"` so it matches the chrome (per spec 018, App\* layer
  only — no `sx`, no raw `@mui`).
- On submit, calls `stripe.confirmPayment({ elements, confirmParams: { return_url } })`.
  The `return_url` points at the post-success route (Decision A picks which).
  The route locale is read via `useLocale()` from `next-intl` and threaded
  into the path — Stripe only appends `payment_intent` +
  `payment_intent_client_secret` query params to the URL we provide; the
  path itself stays in our control, so a hardcoded `/en/` would silently
  break the German funnel.
- Wires the submit-pending and error states via a thin local `useState`
  (the shape matches `EmailForm`'s).
- Reads the cached `clientSecret` from a small client-side fetch to
  `/api/checkout/intent` (see item 3); the fetch runs once on mount.

**Decision B — Stripe Elements (embedded) vs Stripe Checkout (hosted).** The
spec author recommends **Elements + PaymentElement** because (a) it keeps the
user inside the Sorrel chrome (no redirect to a Stripe-hosted domain) and
(b) the funnel's brand consistency is the whole point of the App\* layer.
Stripe Checkout (hosted) is the simpler alternative — one redirect to
`checkout.stripe.com`, one webhook for success — but loses the embedded
brand surface. Akın picks at approval time.

If Decision B picks Hosted Checkout, the `CheckoutForm` shrinks to a single
button that POSTs to `/api/checkout/session` (a different route handler
shape) and then `window.location.assign`s to the returned `session.url`.

## 3. Server-side payment intent route

Create `apps/web/app/api/checkout/intent/route.ts` (a Next.js Route Handler
exporting `POST`). It:

- Reads the funnel `draftId` from the JSON body. The client passes the
  `draftId` it already has from `useFunnel().draftId` (the spec-013
  autosave id).
- Validates the draft by re-running the existing `funnelDraft(id)` GraphQL
  query against the same Apollo server the rest of the app uses; this
  reuses `FunnelDraft.plan.pricing.firstBox.amountMinor` for the charge
  amount (the canonical `Money.amountMinor` field from `schema.graphql`
  line 13 — never a float).
- Imports the `stripe` Node SDK (`import Stripe from "stripe"`) and creates
  a `PaymentIntent` with that amount, the currency from
  `FunnelDraft.plan.pricing.firstBox.currency` mapped to lowercase (Stripe's
  convention; the `Currency` enum is `GBP` → `"gbp"`).
- Attaches `metadata` covering the `draft.id`, `draft.email`, the joined
  `draft.recipeSlugs`, and the `draft.deliveryDate`. This is what makes the
  Stripe dashboard a cross-referenceable view of the funnel for the
  interview demo.
- Returns `{ clientSecret: paymentIntent.client_secret, intentId: paymentIntent.id }`
  as JSON.
- Imports `Stripe` from a single module-scoped factory keyed on
  `process.env.STRIPE_SECRET_KEY` so the SDK constructs once per process,
  not per request. The key is read **inside** the handler (not at module
  top-level) so a build-time absence does not crash the bundle.
- Passes an Idempotency-Key keyed on the draft id
  (`{ idempotencyKey: \`pi-${draftId}\` }`) as the second argument to
`stripe.paymentIntents.create`. Stripe's docs explicitly recommend this on
`create` to guard against double-fetches (React StrictMode, network
  retry, fast back-button); the PaymentIntent's own status-based dedup is
  strong once an intent exists, but doesn't prevent two intents being
  created for the same draft.

## 4. Webhook route (in scope, default YES)

Create `apps/web/app/api/checkout/webhook/route.ts` (a Next.js Route Handler
exporting `POST`). It:

- Reads the raw request body (Next 15 App Router requires
  `await req.text()` for signature verification, not `req.json()`).
- HMAC-verifies against `process.env.STRIPE_WEBHOOK_SECRET` via
  `stripe.webhooks.constructEvent(rawBody, signature, secret)`. Missing or
  invalid signature returns `400`.
- Handles `payment_intent.succeeded` and `payment_intent.payment_failed`.
  On success it pushes into the memory analytics sink the same shape the
  client-side `payment_succeeded` event uses (item 5), tagged with a
  `source: "webhook"` discriminator so the Cypress assertion can tell
  client-emitted from server-emitted events apart.
- Returns `{ received: true }` for everything it handled, `400` for
  signature failures, `200` for events it does not handle (Stripe retries
  non-2xx).

Webhooks REQUIRE a stable public URL. Vercel provides one (the deployed
`sorrel.akinoztorun.dev`). Stripe CLI's `stripe listen --forward-to localhost:3000/api/checkout/webhook`
makes local development possible; the README subsection (item 7) names this.

## 5. Three new typed funnel events

Add to `packages/analytics/src/events.ts` (additive to the spec-009
discriminated union, alphabetical with the existing interfaces):

```ts
/** The server returned a Stripe PaymentIntent client_secret. */
export interface PaymentIntentCreated {
  name: "payment_intent_created";
  step: "CHECKOUT";
  amount_minor: number;
  currency: string;
}

/** Stripe's confirmPayment resolved with status: "succeeded". */
export interface PaymentSucceeded {
  name: "payment_succeeded";
  step: "CHECKOUT";
  intent_id: string;
}

/** Stripe's confirmPayment resolved with an error. */
export interface PaymentFailed {
  name: "payment_failed";
  step: "CHECKOUT";
  intent_id: string | null;
  /** Machine code from Stripe — `card_declined`, `expired_card`, etc. */
  code: string;
}
```

All three are added to the `FunnelEvent` union (lines 56–62) and the
derived `FunnelEventName` widens accordingly. The existing `Track` callsites
stay exhaustive because the union is open-add (no removed members). The
existing `posthogSink` / `mixpanelSink` / `memorySink` transports carry
them unchanged — no new sink, no new transport, no `Track` signature
change.

The events are fired from `CheckoutForm.tsx` through the existing
`useFunnel().track` (the `FunnelProvider` tracker, lines 56–61 of
`FunnelProvider.tsx`).

## 6. Cypress happy path extension

Extend `apps/web/cypress/e2e/funnel/happy-path.cy.ts`:

- The `STEPS` constant (line 18) grows to include `"CHECKOUT"` in the
  position Decision A picks.
- The walk gains a new step block that fills the Payment Element with
  Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC,
  any postal code. Cypress drives Stripe's iframe via
  `cy.get('iframe[name^="__privateStripeFrame"]').then(...)` (the
  standard Stripe-iframe pattern); the spec body names this so the
  implementer does not invent a different approach.
- The typed-event assertion block (lines 116–146) grows to assert
  `payment_intent_created` fires exactly once with `step: "CHECKOUT"`
  and `payment_succeeded` fires exactly once with `step: "CHECKOUT"`
  and a non-empty `intent_id`. `payment_failed` is asserted to have
  length 0 on the happy path.
- The trailing SUMMARY assertion (lines 107–110) moves or stays per
  Decision A.
- The post-success URL assertion uses Stripe's `return_url`
  convention (`?payment_intent=…&payment_intent_client_secret=…&redirect_status=succeeded`)
  and asserts `redirect_status=succeeded`.

The Cypress count moves from `22 + 1 happy-path` to `22 + 1 extended
happy-path` — same file, same single test, more assertions.

## 7. Env handling

Add to `.env` (root, where the existing `NEXT_PUBLIC_*` and
`POSTHOG_PERSONAL_API_KEY` already live — there is no `apps/web/.env.example`
file in the repo today; the memory note "Env vars location" confirms Next
reads the root `.env`):

```
STRIPE_SECRET_KEY=sk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…
```

All three are **test keys** (`sk_test_…`, `pk_test_…`, `whsec_…`). The
real values land in the deployed environment (Vercel) and never in tracked
files — this matches the existing pattern where the committed `.env` has
test/preview tokens only.

The README's "Dev-only test hooks" block (per spec 037) gains a small
**"Stripe test mode"** subsection that names:

- The three env keys and their `sk_test_…` / `pk_test_…` / `whsec_…`
  prefixes.
- The Stripe-published test cards (`4242 4242 4242 4242` succeeds;
  `4000 0000 0000 0002` declines; `4000 0025 0000 3155` triggers 3DS).
- A one-line warning that switching to live mode is its own follow-on
  spec (with a `pk_live_…` / `sk_live_…` prefix change and a separate
  PCI checklist).
- The `stripe listen --forward-to localhost:3000/api/checkout/webhook`
  command for local webhook development.

## 8. CI secret wiring

`.github/workflows/ci.yml` already routes the existing secrets into
`env:` blocks of the relevant jobs. Document in the PR description (and
as a one-liner in the README subsection from item 7) that the GitHub
repo secrets `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` must be set before the Cypress job
that drives the happy-path test will pass.

## 9. New npm dependencies

Three packages, all Stripe-official (per the "no stealth dependencies"
constraint in `.claude/rules/no-invention.md`):

- `@stripe/stripe-js` — client-only loader. Added to
  `apps/web/package.json` under `dependencies`.
- `@stripe/react-stripe-js` — Elements + PaymentElement React wrapper.
  Added to `apps/web/package.json` under `dependencies`.
- `stripe` — Node SDK, server-only. Added to `apps/web/package.json`
  under `dependencies` (Route Handlers run on the Node runtime; the
  bundler tree-shakes it from the client because it is only imported
  from files under `apps/web/app/api/`).

No third-party wrapper. No SDK fork. The implementer commits to the
versions Context7 surfaces at implementation time, not to a version the
spec hard-codes (which would go stale).

# Contract impact

- **`schema.graphql`:** additive — `FunnelStep` enum gains `CHECKOUT`. The
  per-consumer codegen needs a re-run (`yarn codegen`); the spec-007 drift
  guard catches any miss. No other schema change.
- **`packages/shared`:** additive — `FUNNEL_STEPS` gains `"CHECKOUT"`. The
  derived `FunnelStep` union widens. The `funnel.test.ts` schema-sync test
  passes automatically; its one-line bump is the rejection case on line 43.
- **`packages/analytics`:** additive — three new discriminated-union
  members (`PaymentIntentCreated`, `PaymentSucceeded`, `PaymentFailed`)
  and the `FunnelEvent` union grows. `FunnelEventName` widens. The
  existing `Track` keeps compile-time exhaustiveness; no removed members,
  no breaking change.
- **`apps/web` public surface:** additive — one new step page
  (`/wizard/checkout`), two new Route Handlers (`/api/checkout/intent`,
  `/api/checkout/webhook`), one new client component (`CheckoutForm.tsx`).
- **`packages/ui`, `packages/domain`, `services/api`:** untouched. The
  amount used for the charge comes from `FunnelDraft.plan.pricing`, which
  `services/api` already returns; the source-of-truth `Money.amountMinor`
  field is unchanged.

# Out of scope

- **Live (non-test) mode.** This spec ships TEST keys only. The
  `pk_live_…` / `sk_live_…` switch and the PCI checklist that goes with
  it are a future spec.
- **Subscriptions / recurring billing.** The funnel models a one-time
  order today (`Plan.frequency` is `EVERY_2_WEEKS` / `EVERY_4_WEEKS` for
  the customer's delivery cadence, not for a Stripe subscription).
  Stripe Subscriptions is a separate concern.
- **Customer / PaymentMethod storage.** No saved cards, no logged-in
  users, no Stripe Customer objects. Each test-mode order creates a
  one-off PaymentIntent.
- **Tax (Stripe Tax), shipping calculators, address collection beyond
  what Stripe's Payment Element already prompts for.** The PaymentElement's
  defaults are enough for test mode.
- **Refunds, disputes, partial captures.** Out of scope.
- **Webhook idempotency hardening beyond Stripe's standard `event.id`
  dedupe.** A first-pass log + in-memory `event.id` set is enough;
  production-grade hardening (persistent store, retry semantics, replay
  detection) rides a follow-on.
- **Apple Pay / Google Pay configuration.** Stripe's Payment Element
  exposes them automatically when a verified domain is registered;
  that domain-verification step is its own follow-on.
- **Server-side PostHog / Mixpanel capture for `payment_succeeded`.**
  The new typed events fire client-side through the existing
  `posthogSink` / `mixpanelSink` / `memorySink` seam. A server-side
  capture from the webhook (so events fire even when the user closes
  the tab between `confirmPayment` and the redirect) is a follow-on
  spec.
- **A Storybook story for `CheckoutForm`.** Stripe Elements requires
  a live `clientSecret` and a network round-trip; the Storybook story
  for the payment surface rides a future spec or the spec-038
  follow-on.
- **Receipt emails, order-confirmation pages beyond the SUMMARY
  success state, and post-purchase upsells.** Out of scope.

# Acceptance criteria

- [ ] `yarn type-check` green (0 errors/warnings).
- [ ] `yarn lint` green.
- [ ] `yarn format:check` green.
- [ ] `yarn codegen:check` green (the additive `CHECKOUT` enum bump
      regenerates without drift; spec-007 guard passes).
- [ ] `yarn workspace @sorrel/shared test` green — the funnel-step
      schema-sync test passes with the new `CHECKOUT` step in both the
      SDL and the tuple, and the relaxed `isFunnelStep` rejection case
      still pins a still-bogus value.
- [ ] `yarn workspace @sorrel/analytics test` green — the new event
      types compile + serialize the same way the existing union does.
- [ ] `yarn workspace @sorrel/ui test` — 43 passing (unchanged; no UI
      library change).
- [ ] `yarn workspace @sorrel/frontend cypress run` green —
      `22 + 1 extended happy-path` passing / 0 failing. The happy-path
      test drives the Stripe Payment Element with `4242 4242 4242 4242`
      and asserts the three new typed events fire as specified.
- [ ] `STRIPE_SECRET_KEY` is NEVER `NEXT_PUBLIC_*`. Verify with
      `grep -r "STRIPE_SECRET_KEY" apps/web/.next/static` on the prod
      build output — must return zero matches. The PR description names
      this exact grep.
- [ ] The webhook endpoint rejects requests without a valid
      `Stripe-Signature` header with `400`. A Jest unit test in
      `apps/web/app/api/checkout/webhook/route.test.ts` confirms the
      reject path.
- [ ] `README.md` "Dev-only test hooks" block (per spec 037) gains a
      "Stripe test mode" subsection that names the three env keys, the
      three test cards (succeed / decline / 3DS), the
      `stripe listen` command, and the one-line warning that live mode
      is its own follow-on spec.
- [ ] No `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or
      `// @ts-nocheck` added.
- [ ] No new dependency outside the three Stripe-official packages
      named in scope item 9.
- [ ] No real-world competitor name, logo, copy, or asset is
      referenced. Stripe is the payment processor; the rest is Sorrel
      brand.
- [ ] Commit subject includes the canonical `Spec: 039` trailer.

# Analytics

The spec ADDS to the spec-009 typed `FunnelEvent` union — additive, no
breaking. Three new event names, each with `step: "CHECKOUT"` as a
top-level discriminated-union prop (the `FunnelEvent` convention from
`packages/analytics/src/events.ts`, NOT nested under a `.props` object —
the Cypress happy-path test calls this out explicitly on lines 113–115):

- `payment_intent_created` — server returned a `client_secret`. Props:
  `step: "CHECKOUT"`, `amount_minor: number`, `currency: string`.
- `payment_succeeded` — Stripe SDK resolved
  `stripe.confirmPayment` with `paymentIntent.status === "succeeded"`.
  Props: `step: "CHECKOUT"`, `intent_id: string`.
- `payment_failed` — Stripe SDK resolved with an error. Props:
  `step: "CHECKOUT"`, `intent_id: string | null`, `code: string`.

The existing `step_completed` event also fires for the CHECKOUT step
through the same `WizardChrome.handleNext` path it fires for every other
step — no change to that callsite. The existing `funnel_step_viewed`
event fires on entry to CHECKOUT through the same `FunnelProvider`
effect that fires it for every other step.

The existing `Track` seam (`apps/web/app/[locale]/wizard/analytics.ts`)
carries the new events through `posthogSink` / `mixpanelSink` /
`memorySink` unchanged; no new sink, no new transport.
