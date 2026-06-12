---
spec: 009
title: Analytics event contract — typed funnel events (the conversion firewall)
status: proposed
approved: yes
tier: 1
owner: packages/analytics · packages/shared
---

# Problem / gap

The project thesis is _conversion is an engineering discipline: instrument, find the step,
fix the step, lock it with budgets_ — yet there is no instrumentation contract. `packages/
analytics` is an empty directory; the architecture and the `funnel-reviewer` agent both
reference it as "a typed funnel event contract shared by web and seed scripts," but nothing
exists to share. Without it, the wizard (spec 010) would hand-roll `track("string", {...})`
calls — the exact untyped drift the funnel-reviewer is built to catch.

This is the same move as the GraphQL schema (007): **agree the event shape once, type it,
make every emit checked.** Events are the second contract in the repo, parallel to
`schema.graphql`. This spec lays that contract **before** the wizard consumes it.

# Scope

## `packages/shared` — canonical step identity (prerequisite)

Funnel events are keyed by step, so the step type must exist as a consumable TS value
(today `FunnelStep` lives only in `schema.graphql` and the server-private generated resolver
types — neither is importable by web or seed scripts). Per spec 007's note, a base enum
authored once and shared lives in `@sorrel/shared`.

- `packages/shared/src/funnel.ts`:
  - `FUNNEL_STEPS` — the ordered tuple `["CATS","PROFILE","RECIPES","DELIVERY","PLAN","EMAIL","SUMMARY"]`
    (`as const`). Order is the funnel order; index drives progress.
  - `type FunnelStep = (typeof FUNNEL_STEPS)[number]` — the app-side step union.
- `packages/shared/package.json` (`@sorrel/shared`), `tsconfig.json`, `jest.config.ts`,
  `src/index.ts` barrel — first time this workspace gets a `src/`.
- **Schema-sync test** — `packages/shared/src/funnel.test.ts` reads `schema.graphql`
  (same `readFileSync` pattern as `scripts/codegen-check.mjs`), extracts the `FunnelStep`
  enum members, and asserts they equal `FUNNEL_STEPS` **as a set and in order**. Drift in
  either the schema or the shared tuple fails the build. This is the "make wrong
  un-mergeable" bridge between the network enum and the app-side type — neither is allowed
  to silently diverge.

## `packages/analytics` — the typed event union + sink

- `packages/analytics/src/events.ts` — a discriminated union, each event keyed by `name`:

  ```ts
  export interface FunnelStepViewed {
    name: "funnel_step_viewed";
    step: FunnelStep;
    variant?: string; // A/B bucket, e.g. the autocomplete-postcode flag
  }
  export interface StepCompleted {
    name: "step_completed";
    step: FunnelStep;
    variant?: string;
  }
  export interface FieldError {
    name: "field_error";
    step: FunnelStep;
    field: string; // which input failed
    error: string; // machine code, not the display copy — e.g. "required", "out_of_range"
  }
  export interface FunnelAbandoned {
    name: "funnel_abandoned";
    step: FunnelStep; // furthest step reached before leaving
  }
  export interface ExitIntentShown {
    name: "exit_intent_shown";
    step: FunnelStep; // step the recovery modal was shown on
  }
  export interface ExitIntentRecovered {
    name: "exit_intent_recovered";
    step: FunnelStep; // user took the "keep going" action instead of leaving
  }
  export type FunnelEvent =
    | FunnelStepViewed
    | StepCompleted
    | FieldError
    | FunnelAbandoned
    | ExitIntentShown
    | ExitIntentRecovered;
  ```

  The two `exit_intent_*` events make the exit-intent recovery modal (a proven conversion
  win, fired by the wizard in spec 010) measurable: recovery rate = `exit_intent_recovered`
  ÷ `exit_intent_shown`. A dismissal-then-leave needs no separate event — it is the absence
  of a `recovered` followed by `funnel_abandoned`. They live in the contract (not in spec
  010) because every funnel event belongs in one typed firewall.

- `packages/analytics/src/sink.ts` — the transport seam so web and seed share one contract
  but different destinations:

  ```ts
  export interface AnalyticsSink {
    emit(event: FunnelEvent): void;
  }
  export function createTracker(sink: AnalyticsSink): (event: FunnelEvent) => void;
  ```

  `createTracker` returns a typed `track` — callers can only pass a valid `FunnelEvent`, so
  a missing `variant` on an A/B step or a typo'd event name is a compile error, not a
  runtime no-op. A `consoleSink` (dev default) and a `memorySink` (returns a captured array,
  for tests and the seed script) ship in this package; the real provider sink is the
  wizard's wiring (spec 010) — the contract does not bind to a vendor.

- `packages/analytics/src/events.test.ts` — type-level + runtime assertions: `memorySink`
  captures emitted events in order; `createTracker` forwards faithfully; an exhaustiveness
  switch over `FunnelEvent['name']` has no `default` gap (a new event without a handler
  fails type-check).

## Tooling

- Wire `ts-jest` transform in both new `jest.config.ts` files (matching `packages/domain`).
- Add `@sorrel/shared` as a dep of `@sorrel/analytics`.

# Contract impact

None to `schema.graphql` or `packages/domain`. This **creates** a second contract
(`FunnelEvent`) alongside the GraphQL one. The schema-sync test makes `schema.graphql`'s
`FunnelStep` and `@sorrel/shared`'s `FUNNEL_STEPS` mutually binding — but it only *asserts*
the existing schema, it does not change it.

# Out of scope

- The real analytics provider/vendor sink (PostHog, Segment, etc.) — the wizard wires a
  concrete sink in spec 010; this contract stays vendor-neutral. No vendor SDK is added here.
- The seed script that replays the drop-off curve — its own spec; it will import
  `memorySink` + `FunnelEvent` from this package.
- Firing the events — that is the wizard's job (spec 010). This spec ships only the contract
  and its in-package tests.
- Funnel A/B flag plumbing (the `variant` source) — spec 010.

# New dependencies (flagged for approval)

None. No external packages. `@sorrel/shared` and `@sorrel/analytics` are internal workspaces.

# Acceptance criteria

- [ ] `@sorrel/shared` exports `FUNNEL_STEPS` + `FunnelStep`; schema-sync test passes and
      fails on injected drift (verified both directions)
- [ ] `@sorrel/analytics` exports `FunnelEvent` (incl. `exit_intent_shown` /
      `exit_intent_recovered`) + `AnalyticsSink` + `createTracker` + `consoleSink` / `memorySink`
- [ ] Exhaustiveness over `FunnelEvent['name']` is compiler-enforced (no `default` escape)
- [ ] `yarn type-check` green (0 errors/warnings); new unit tests pass; existing 25 domain +
      10 api tests stay green
- [ ] No external deps added; no vendor SDK; no real-brand names/assets

# Analytics

This spec **defines** `funnel_step_viewed`, `step_completed`, `field_error`,
`funnel_abandoned`, `exit_intent_shown`, `exit_intent_recovered` and their props (`step`,
`variant`, `field`, `error`). It does not fire them — emission and prop population are the
wizard's responsibility (spec 010).
