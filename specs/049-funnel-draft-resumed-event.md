---
spec: 049
title: Add funnel_draft_resumed analytics event
status: proposed
approved: yes
tier: 2 # JD coverage: closes an instrumentation gap on a claimed recovery lever
owner: packages/analytics · apps/web
---

# Problem / gap

The README pitches draft-resume as a recovery lever — a returning user picks up an
in-progress order instead of starting over — but that lever is currently
**unverifiable**. When a draft is restored from `localStorage`, `FunnelProvider`
dispatches the `HYDRATE` action (`apps/web/app/[locale]/wizard/FunnelProvider.tsx`,
the `useEffect` at lines 83–94) and `ResumeBanner` renders its "welcome back"
affordance, yet **zero analytics events fire** on that path. The typed contract in
`packages/analytics/src/events.ts` (`FunnelEvent`) has no member for a resume, so
there is no event to query, no resume-rate metric, and no way to compare resume
behaviour across A/B arms. The existing recovery events (`exit_intent_shown`,
`exit_intent_recovered`, `funnel_abandoned`) cover the exit-intent modal, not the
returning-session restore. No approved spec covers this signal.

This spec adds one new discriminated-union member, `funnel_draft_resumed`, emitted
when a draft is hydrated, and back-fills a synthetic cohort in the seed scripts so
the demo's analytics has resume data.

# Scope

Exact symbols and files touched:

- **`packages/analytics/src/events.ts`** — add a new interface following the
  `FunnelAbandoned` shape exactly, and add it to the `FunnelEvent` union (which
  in turn extends `FunnelEventName`):

  ```ts
  /** A saved draft was restored from localStorage on a returning session. */
  export interface FunnelDraftResumed {
    name: "funnel_draft_resumed";
    /** Furthest step the restored draft had reached — where the user resumes. */
    step: FunnelStep;
    /** A/B bucket, carried so resume-rate is attributable per variant. */
    variant?: string;
  }
  ```

  Append `| FunnelDraftResumed` to `export type FunnelEvent`.

- **`packages/analytics/src/events.test.ts`** — add a `case "funnel_draft_resumed":`
  to the `summarize()` exhaustiveness switch (lines 11–30, no `default`), and an
  assertion in the `summarize (exhaustiveness)` describe block. Optionally extend
  the variant-carriage tests to cover the new event.

- **`apps/web/app/[locale]/wizard/FunnelProvider.tsx`** — in the hydrate effect
  (lines 84–94), after a successful `dispatch({ type: "HYDRATE", ... })`, emit
  `track({ name: "funnel_draft_resumed", step: <restored furthest step>, variant:
  variantRef.current ?? undefined })` **only when the restored draft is genuinely
  resumable** (see decision note below). Variant is read via the existing
  `variantRef` fail-open pattern (lines 66–70, 119–138); resume must not block on
  variant resolution.

- **`apps/web/scripts/seed-posthog.ts`** and **`apps/web/scripts/seed-mixpanel.ts`**
  — in `emitSession()` (around lines 80–125 / 85–124, identical in both), for a
  deterministic subset of non-converting sessions (`furthest < last`), prepend a
  `funnel_draft_resumed` event at `step: FUNNEL_STEPS[furthest]` before the
  abandonment block. Target roughly 30% of non-converted sessions (a fixed
  `index % 10 < 3` style gate keeps `$insert_id` deterministic so PostHog/Mixpanel
  dedup re-runs). Carry `variant` on the event.

# Contract impact

Does not touch `schema.graphql` or `packages/domain`. The only contract changed is
the **analytics event contract** (`packages/analytics/src/events.ts`), and the
change is **purely additive**: a new union member. Consequences:

- `FunnelEventName` gains `"funnel_draft_resumed"` automatically (derived from the
  union).
- The `summarize()` exhaustiveness switch in `events.test.ts` will fail to compile
  until its `case` is added — this is the intended compile-time gate, not a
  regression.
- No existing emit site changes shape; all current events remain valid.

# Out of scope

- **No new `ExperimentVariant` type.** The task brief named `variant: ExperimentVariant`,
  but no such type exists in the repo (the app's bucket type is `Variant = "A" | "B"`
  from `useVariant.ts`; the contract uses `variant?: string`). This spec follows the
  established `funnel_abandoned` shape (`variant?: string`) and does **not** introduce
  a new shared type. Promoting `variant` to a named non-optional type is a separate,
  contract-wide decision (it would touch every existing event) — explicitly excluded.
- **No /insights surfacing.** This is a secondary enrichment signal; no new chart,
  tile, or query is added to the insights page.
- **No server-side resume tracking.** The draft autosave write-path
  (`useDraftAutosave`, spec 013) is untouched; this event is client-emit only.
- **No change to `ResumeBanner` behaviour or copy**, and no new event when the user
  *clicks* "Resume" (that would be a distinct `resume_clicked`-style event — not in
  this spec). This spec fires on *restore*, not on the click.
- **No reducer/state-shape change.** `FunnelState.furthestStep` and the `HYDRATE`
  action are used as-is.

# Decision the human must resolve before approval

The brief says emit "when the restored state has a **non-null** `furthestStep`."
But `furthestStep` is typed `FunnelStep` (non-nullable) and defaults to `"CATS"`
(`state.ts` lines 30, 39) — it is **never null**. A literal "non-null" guard would
fire on *every* hydrate, including a brand-new draft sitting at `CATS`, inflating
resume-rate. The faithful intent of a *resume* matches `ResumeBanner`'s own guard
(`ResumeBanner.tsx` line 20): there is real progress to resume, i.e.
`restored.furthestStep !== "CATS"`. **Recommended guard: `restored.furthestStep !== FUNNEL_STEPS[0]`.**
The reviewer must confirm this interpretation (resume = progress beyond the first
step) versus a literal every-hydrate emit before implementation proceeds.

# Acceptance criteria

- [ ] `yarn type-check` green (0 errors/warnings) — including the `events.test.ts`
      exhaustiveness switch covering the new member.
- [ ] `yarn lint` clean.
- [ ] `yarn workspace @sorrel/domain test` and the analytics tests pass; a test
      asserts `funnel_draft_resumed` round-trips through tracker→sink with `variant`.
- [ ] `funnel_draft_resumed` fires exactly once per resumable hydrate in
      `FunnelProvider`, carrying `step` (the restored furthest step) and `variant`
      (fail-open `undefined` when unresolved), and does **not** fire for a
      fresh-at-`CATS` draft (per the approved guard decision).
- [ ] Both seed scripts emit a deterministic ~30% cohort of resume events on
      non-converted sessions; re-running the seed does not duplicate events
      (`$insert_id` stable).
- [ ] No changes to `schema.graphql`, `packages/domain`, or the /insights page.

# Analytics

New typed event:

- **`funnel_draft_resumed`** — `{ name: "funnel_draft_resumed"; step: FunnelStep;
  variant?: string }`. Fires once when a resumable draft is restored from
  `localStorage` on session start. `step` = the restored `furthestStep`;
  `variant` = the A/B arm (so resume-rate splits per arm). Mirrors the
  `funnel_abandoned` structure.

Existing events are unaffected: `funnel_step_viewed`, `step_completed`,
`field_error`, `funnel_abandoned`, `exit_intent_shown`, `exit_intent_recovered`
continue to fire with their current props. The new event is additive enrichment
sitting alongside them on the resumed-session path.
