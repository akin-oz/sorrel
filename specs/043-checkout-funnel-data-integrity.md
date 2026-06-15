---
spec: 043
title: Spec 039 follow-on — CHECKOUT funnel data integrity — extend seed scripts to 7 retention transitions, attach variant to payment events, defer first CATS emit until variant resolves, lock variant carriage in the analytics contract test, regenerate the static insights fallback to 8 steps
approved: yes
tier: 2 # JD coverage — the live conversion story has to hold up
owner: packages/analytics/src/events.ts · packages/analytics/src/events.test.ts · apps/web/scripts/seed-{funnel,posthog,mixpanel}.ts · apps/web/lib/insights-data.json · apps/web/app/[locale]/wizard/FunnelProvider.tsx · apps/web/app/[locale]/wizard/CheckoutForm.tsx
---

# Problem / gap

The 2026-06-15 delivery-readiness audit (telemetry / conversion PM) found
that spec 039's `CHECKOUT` step addition silently broke the seed→insights
chain. Spec 039 added `CHECKOUT` as the 8th `FunnelStep` in
`packages/shared/src/funnel.ts:12-21` and in `schema.graphql`. The three
seed scripts (`apps/web/scripts/seed-{funnel,posthog,mixpanel}.ts`) were
**not** updated to match — their per-variant `RETENTION` arrays still hold
six transitions (CATS→…→SUMMARY) while the funnel now needs seven
(CATS→…→SUMMARY→CHECKOUT). The live `/insights` query in
`apps/web/lib/insights-posthog.ts:29` maps over all 8 steps and asks
PostHog for an 8-series ordered funnel; with no `CHECKOUT` events
seeded, both arms read as 0% completion when `POSTHOG_PERSONAL_API_KEY`
is set in Vercel. Two other lower-severity gaps surfaced in the same
audit cluster: the three payment events carry no `variant` property so
the A/B story stops at SUMMARY, and the CATS `funnel_step_viewed`
event often fires with `variant: undefined` because
`posthog.getFeatureFlag` resolves asynchronously after the first effect.

The five concrete findings, with severity from the audit:

1. **BLOCKER (Telemetry-B1) — seed scripts iterate 7 transitions but
   `RETENTION` has 6 entries.** `seed-posthog.ts:130-138` (mirrored in
   `seed-mixpanel.ts` and `seed-funnel.ts`):

   ```ts
   function buildVariant(variant: Variant) {
     const viewed = viewedCounts(RETENTION[variant]); // 7 elements (index 0..6)
     for (let i = 0; i < FUNNEL_STEPS.length - 1; i += 1) {
       // FUNNEL_STEPS.length - 1 = 7 → loop i = 0..6
       const dropping = viewed[i] - viewed[i + 1]; // at i=6: viewed[6] - viewed[7] = 97 - undefined = NaN
       for (let n = 0; n < dropping; n += 1) emitSession(variant, i, index++);
     }
     const converters = viewed[FUNNEL_STEPS.length - 1]; // viewed[7] = undefined
     for (let n = 0; n < converters; n += 1) emitSession(variant, FUNNEL_STEPS.length - 1, index++);
     return { started: viewed[0], converted: converters };
   }
   ```

   `Math.round(viewed[6] * RETENTION[6])` is `NaN`, the inner loop runs
   zero times, and the converters loop also runs zero times — **no
   CHECKOUT sessions are emitted in either arm**. The summary log
   reports `converted: undefined`. The committed
   `apps/web/lib/insights-data.json` (a 7-step shape, last generated
   before spec 039 shipped) is internally consistent but stale relative
   to the live `FUNNEL_STEPS` contract.

2. **BLOCKER (Telemetry-B2) — `/insights` live query reads 0% completion.**
   `apps/web/lib/insights-posthog.ts:29` maps `FUNNEL_STEPS` (now 8
   entries) into the PostHog `FunnelsQuery` series. When the personal
   key is set in Vercel, PostHog returns 8 series with CHECKOUT count =
   0 (no events seeded). `mapResponse` (lines 53–77) computes
   `completionRate = viewed[last] / viewed[0] = 0 / 300 = 0`. The page
   renders **A · 0.0% vs B · 0.0%, lift = +0.0 pp** — a live-data
   story actively worse than the static fallback.

3. **MAJOR (Telemetry-M5) — payment events carry no `variant`
   property.** `packages/analytics/src/events.ts` lines 57–80 — the
   three payment event interfaces (`PaymentIntentCreated`,
   `PaymentSucceeded`, `PaymentFailed`) have no `variant?: string`
   field. `apps/web/app/[locale]/wizard/CheckoutForm.tsx` lines 33,
   59–74, 138–142 emits all three without `variant`. The A/B story
   stops at SUMMARY; we cannot answer "does variant B's PROFILE lift
   also lift payment conversion?" in the dashboards.

4. **MAJOR (Telemetry-M4) — CATS `funnel_step_viewed` fires with
   `variant: undefined`.** `apps/web/app/[locale]/wizard/FunnelProvider.tsx:108`
   reads `variantRef.current ?? undefined`. `useVariant` calls
   `posthog.getFeatureFlag("profile-input")` which resolves after the
   PostHog SDK's `onFeatureFlags` callback. The CATS effect often fires
   before that resolves; the resulting `funnel_step_viewed` event
   lands in PostHog with no `variant` property, creating a third
   un-attributed cohort separate from A and B in any
   variant-broken-down funnel.

5. **MAJOR (QA-M5) — `events.test.ts` does not assert `variant`
   carriage through the tracker→sink round-trip.** The
   `summarize` test at `packages/analytics/src/events.test.ts:75`
   exercises every event name but never builds a `step_completed` or
   `funnel_step_viewed` with `variant: "A"` and asserts that the field
   survives the `createTracker(memorySink)` call. The contract allows
   `variant` to be optional; nothing locks the wire fan-out shape.

No existing approved spec covers any of these five items. Spec 039
deliberately deferred the variant-on-payment-events and the seed-script
update to its own follow-on, which this spec is.

# Scope

The exact files this spec touches. No file outside these is edited.

## 1. Extend seed-script `RETENTION` arrays to 7 transitions

- Edit `apps/web/scripts/seed-funnel.ts`, `apps/web/scripts/seed-posthog.ts`,
  and `apps/web/scripts/seed-mixpanel.ts`. In each, the `RETENTION`
  table currently reads:
  ```ts
  const RETENTION: Record<Variant, number[]> = {
    A: [0.82, 0.7, 0.81, 0.89, 0.86, 0.91],
    B: [0.82, 0.78, 0.81, 0.89, 0.86, 0.91],
  };
  ```
  Append a 7th entry — SUMMARY→CHECKOUT — to each array:
  ```ts
  const RETENTION: Record<Variant, number[]> = {
    A: [0.82, 0.7, 0.81, 0.89, 0.86, 0.91, 0.75],
    B: [0.82, 0.78, 0.81, 0.89, 0.86, 0.91, 0.75],
  };
  ```
- **Decision A — the SUMMARY→CHECKOUT seeded rate.** Recommendation:
  **0.75 in both arms.** The A/B lever in this funnel is the PROFILE
  step (autocomplete with smart defaults vs inline pills), not the
  checkout. A user who has reviewed SUMMARY and clicked "Pay now"
  completes Stripe's PaymentElement at the same rate regardless of how
  they got there. 0.75 is plausible for a fictional cat-food brand's
  test-mode flow (some users get the modal and abandon; some hit a
  3DS challenge they don't complete). Both arms equal removes any
  spurious "payment conversion lifted too" claim.
  - Alternative B (out of scope): bias arm B slightly higher. Not
    recommended — the story is the PROFILE lever, full stop.

- All three scripts share the same shape and same value table; updates
  must stay in lock-step. The schema-sync test in
  `packages/shared/src/funnel.test.ts` already enforces that
  `FUNNEL_STEPS` and the GraphQL enum cannot drift; no equivalent
  test enforces RETENTION-array length, but spec 044 adds a guard for
  that (see "Cross-spec coordination" below).

## 2. Add `variant?: string` to the three payment events

- Edit `packages/analytics/src/events.ts` lines 57–80. Add a
  `variant?: string;` field to each interface, matching the existing
  pattern on `FunnelStepViewed` (line 16) and `StepCompleted` (line 23):
  ```ts
  export interface PaymentIntentCreated {
    name: "payment_intent_created";
    step: "CHECKOUT";
    amount_minor: number;
    currency: string;
    variant?: string;
  }
  export interface PaymentSucceeded {
    name: "payment_succeeded";
    step: "CHECKOUT";
    intent_id: string;
    variant?: string;
  }
  export interface PaymentFailed {
    name: "payment_failed";
    step: "CHECKOUT";
    intent_id: string | null;
    code: string;
    variant?: string;
  }
  ```
- Edit `apps/web/app/[locale]/wizard/CheckoutForm.tsx`. Destructure
  `variant` from `useFunnel()` (line 33 currently destructures only
  `track`, `confirm`, and the rest of the API). Attach
  `variant: variant ?? undefined` to the three `track({...})` calls at
  lines 59–74 (`payment_failed`, `payment_succeeded`) and 138–142
  (`payment_intent_created`).

## 3. Defer first CATS `funnel_step_viewed` until variant resolves

- Edit `apps/web/app/[locale]/wizard/FunnelProvider.tsx` around line
  108 (the `funnel_step_viewed` emit effect). Add a guard:
  ```ts
  // Variant is resolved asynchronously by PostHog's onFeatureFlags
  // callback. To avoid an un-attributed CATS event in the variant-broken-down
  // funnel, hold the first emit until variant is non-null OR a short timeout
  // elapses (PostHog never resolves → still emit, marked variant: undefined).
  ```
  Replace the immediate emit with a small state machine:
  - If `variantRef.current` is non-null, emit immediately as today.
  - Otherwise, wait at most 750ms for `variantRef.current` to become
    non-null (poll via `useEffect` cleanup + a setTimeout). On
    resolve, emit with the resolved variant. On timeout, emit with
    `variant: undefined` (current behaviour) — fail-open so a
    PostHog-down scenario still produces a funnel event.
  - The 750ms window is short enough not to noticeably delay the
    first page-step transition and long enough to cover a normal
    network round-trip + the SDK's flag eval.
- The same guard does **not** need to repeat on subsequent steps
  (PROFILE onwards) — variant resolves once per session and the ref
  stays populated.
- Acceptance criterion: a Cypress test asserts that on a slow flag
  resolve, the captured `funnel_step_viewed` for CATS has the resolved
  `variant`, not `undefined`. Add this assertion under spec 044's
  scope (the test-coverage spec).

## 4. Regenerate the static insights fallback to 8 steps

- After §1 lands and the maintainer re-runs `yarn workspace
@sorrel/frontend seed` (the local `seed-funnel.ts` path that writes
  `apps/web/lib/insights-data.json`), the static fallback is updated
  in tree. The file's `steps` array goes from 7 entries to 8 (adds
  `"CHECKOUT"`). The `variants.{A,B}.viewed` arrays grow from 7 to 8
  numbers each. The `completionRate` recomputes against `viewed[7]`.
- The maintainer commits the regenerated `insights-data.json` under
  the same `Spec: 043` trailer.
- Acceptance criterion: `apps/web/lib/insights-data.json` `steps`
  array length is 8. `variants.A.viewed.length === 8`,
  `variants.B.viewed.length === 8`. The `completionRate` values are
  consistent with the new arrays (last-element / first-element,
  rounded to 4 dp).

## 5. Lock `variant` carriage in the contract test

- Edit `packages/analytics/src/events.test.ts`. Add a new `it(...)`
  block after the existing "handles every event variant" test that
  exercises the tracker→sink round-trip for `variant`:

  ```ts
  it("preserves variant on step_completed and funnel_step_viewed through tracker→sink", () => {
    const sink = createMemorySink();
    const track = createTracker(sink);
    track({ name: "step_completed", step: "PROFILE", variant: "A" });
    track({ name: "funnel_step_viewed", step: "CATS", variant: "B" });
    expect(sink.events).toEqual([
      { name: "step_completed", step: "PROFILE", variant: "A" },
      { name: "funnel_step_viewed", step: "CATS", variant: "B" },
    ]);
  });

  it("preserves variant on the three payment events through tracker→sink", () => {
    const sink = createMemorySink();
    const track = createTracker(sink);
    track({
      name: "payment_intent_created",
      step: "CHECKOUT",
      amount_minor: 4995,
      currency: "GBP",
      variant: "A",
    });
    track({ name: "payment_succeeded", step: "CHECKOUT", intent_id: "pi_x", variant: "A" });
    track({
      name: "payment_failed",
      step: "CHECKOUT",
      intent_id: null,
      code: "card_declined",
      variant: "B",
    });
    expect(sink.events.map((e) => (e as { variant?: string }).variant)).toEqual(["A", "A", "B"]);
  });
  ```

- If `createTracker` / `createMemorySink` aren't already imported in
  the test, add the imports. The test must FAIL on a tracker that
  drops `variant` and PASS on the current pass-through implementation.

# Contract impact

- `schema.graphql`: untouched (no new fields, no new types — the
  `FunnelStep` enum already contains `CHECKOUT` from spec 039).
- `packages/domain`: untouched.
- `packages/analytics`: **three additive field additions** in
  `events.ts` — `variant?: string` on `PaymentIntentCreated`,
  `PaymentSucceeded`, `PaymentFailed`. Pure-additive; existing emit
  sites (which never set `variant`) stay valid. Existing consumers
  that read `event.variant` already handle `undefined` (see
  `FunnelProvider.tsx:108` for the existing pattern).
- `packages/ui`: untouched.
- No new GraphQL types. No new typed analytics event names. No new
  npm/yarn dependencies.

# Out of scope

- Identifying anonymous users at the EMAIL step (`posthog.identify(email)`).
  Telemetry-m1 in the audit. Worth doing eventually but distinct
  enough to warrant its own spec — it changes the demo's
  identity-resolution story and needs UX consideration.
- Re-running `yarn seed:posthog` and `yarn seed:mixpanel` against the
  live PostHog (EU project 200647) and Mixpanel (EU project 4033871)
  projects. That is an **operational** step the maintainer runs after
  this spec ships. The seed scripts dedup on `$insert_id` so re-running
  overwrites the stale 6-transition data with the new 7-transition data
  without double-counting.
- Verifying the `profile-input` feature flag exists in PostHog with
  the right variants and rollout (Telemetry-M2). Operational.
- The `NEXT_PUBLIC_*` env-var presence in Vercel build (Telemetry-M1).
  Spec 040 covers the .env.example template and README documentation;
  populating the Vercel dashboard is operational.
- Any change to the GraphQL `FunnelStep` enum or `schema.graphql`. The
  enum is canonical and unchanged.
- Adding a per-script length-equality test that `RETENTION` and
  `FUNNEL_STEPS.length - 1` agree. Spec 044 covers test-rigor for
  the seed scripts.

# Acceptance criteria

- [ ] `yarn type-check && yarn lint && yarn format:check` — clean (0
      warnings, 0 errors).
- [ ] `yarn workspaces run test` — every workspace's jest suite green.
- [ ] `yarn workspace @sorrel/analytics test` includes the two new
      `variant`-carriage tests; both pass; a fabricated regression
      (deleting `variant` from the tracker copy) reds them.
- [ ] Each of `apps/web/scripts/seed-funnel.ts`,
      `apps/web/scripts/seed-posthog.ts`, and
      `apps/web/scripts/seed-mixpanel.ts` has a 7-entry `RETENTION.A`
      and 7-entry `RETENTION.B` array. A
      `grep -nE '0\.91,\s*0\.75' apps/web/scripts/seed-*.ts`
      returns 6 hits (3 files × 2 arms).
- [ ] `packages/analytics/src/events.ts` `PaymentIntentCreated`,
      `PaymentSucceeded`, and `PaymentFailed` each declare a
      `variant?: string;` field.
- [ ] `apps/web/app/[locale]/wizard/CheckoutForm.tsx` destructures
      `variant` from `useFunnel()` and passes it on all three payment
      event `track({...})` calls.
- [ ] `apps/web/app/[locale]/wizard/FunnelProvider.tsx` contains the
      750ms defer-until-variant-resolves guard around the first
      `funnel_step_viewed` emit. A code comment explains the
      fail-open behaviour.
- [ ] After running `yarn workspace @sorrel/frontend seed`,
      `apps/web/lib/insights-data.json` has `steps.length === 8`,
      `variants.A.viewed.length === 8`,
      `variants.B.viewed.length === 8`. The committed file is the
      regenerated one.
- [ ] `yarn workspace @sorrel/frontend cypress run` — identical pass
      count to the pre-spec baseline. The variant-deferral change in
      §3 must not red the existing happy-path spec; the test pins
      `window.__sorrelVariant = "A"` synchronously so the deferral
      window resolves to "A" before the 750ms timeout.
- [ ] No `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or
      `ignoreDeprecations` added anywhere in the diff.
- [ ] The implementation commit subject(s) include the `Spec: 043`
      trailer (canonical form).
- [ ] **Operational note** (not gated, but flagged): after merge, the
      maintainer runs `yarn workspace @sorrel/frontend seed:posthog`
      and `yarn workspace @sorrel/frontend seed:mixpanel` against the
      live projects to replace the stale 6-transition data.

# Analytics

This spec touches the typed funnel event contract additively. After
landing:

- `payment_intent_created`, `payment_succeeded`, `payment_failed` each
  carry an optional `variant: string` field — the same A/B bucket
  every other step event carries.
- The PROFILE→RECIPES retention lift can now be cross-referenced with
  the SUMMARY→CHECKOUT completion rate per variant: "did the variant-B
  lift extend into payment, or stop at SUMMARY?" The honest seeded
  answer (per Decision A above) is "it stops at SUMMARY" — both arms
  complete payment at 0.75. A future spec can revisit if the live
  organic data tells a different story.
- The CATS `funnel_step_viewed` event now reliably carries a resolved
  `variant` for the vast majority of users (the 750ms window covers
  normal PostHog SDK flag-eval latency). The fail-open path is
  preserved — a PostHog-down browser still emits the event with
  `variant: undefined`, rather than dropping the event entirely.
