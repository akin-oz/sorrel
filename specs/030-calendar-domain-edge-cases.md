---
spec: 030
title: Pin calendar-domain edge cases (DST, leap, year-boundary, toWeeks padding, IsoDate UTC round-trip)
approved: yes
tier: 1 # 1 credible core · 2 JD coverage · 3 closers
owner: packages/domain
---

# Problem / gap

Spec 024 landed a 28-case Jest suite that pins the calendar's highest-risk
behaviours at least once (`packages/domain/src/delivery/calendar.test.ts`). A
follow-on review of the picker (Phase 1 of the centerpiece test-coverage audit)
flagged ten edge cases that remain unprotected and would silently regress under
a future timezone or calendar refactor:

- Feb 2024 leap-month grid math (`buildMonthView` leading-blanks + cell count).
- The March-2026-after-Feb-common handoff, where Feb's 28 could leak into
  March's `mondayIndex` if a future refactor caches Feb state.
- Year-boundary behaviour of `mondayIndex` on a January-1 ISO.
- DST spring-forward day math — `addDays`/`mondayIndex` must stay UTC-stable on
  the 2026-03-28→29 transition regardless of host TZ. Today's implementation is
  UTC-only by design (`calendar.ts:53,57-59,63-64,74`), but no test pins it.
- Two additional `earliestDeliverableDate` weekday-skip variants (Thu+4 ⇒ Mon,
  Tue→Wed one-step skip) to lock the while-loop boundary.
- The `moveFocus` Sunday + `End` no-op — `clampToMonth` plus the
  `6 - mondayIndex(sun)` math must net to the same Sunday ISO, with no leak
  into the next week.
- An `IsoDate` UTC round-trip under a non-UTC TZ shim — `toIso ∘ parseIso ===
identity` must hold when `process.env.TZ` is forced to a non-UTC zone, so any
  future `getDate`/`getMonth` (local-time) regression in `calendar.ts` is caught
  by the suite rather than by a Cypress TZ run.
- `toWeeks` last-row padding — today this helper lives only in
  `packages/ui/src/DeliveryDatePicker.tsx:362-368` and is duplicated as an
  inline copy inside the domain test (`calendar.test.ts:178-192`) so spec 024
  could pin the padding contract without changing the export surface. That
  duplication is now the gap: the production helper and the test helper can
  drift.
- A property-style sweep over a 365-day window: for every `today` in the year,
  `earliestDeliverableDate(today)` must land on a deliverable weekday. This is
  the cheapest insurance against a weekday-pattern regression in the skip loop
  (`calendar.ts:96-101`).

No existing approved spec covers these. Spec 024 explicitly stopped at the
six highest-risk behaviours and left these for a follow-on; specs 025 / 028 /
029 are UI-only.

# Scope

Single-package change. Files touched:

- `packages/domain/src/delivery/calendar.test.ts` — add ten new test cases
  (D-01 … D-10), enumerated below. Existing 28 cases unchanged.
- `packages/domain/src/delivery/calendar.ts` — add a single new export,
  `toWeeks(leadingBlanks, cells)`, lifted verbatim from
  `packages/ui/src/DeliveryDatePicker.tsx:362-368`. Pure function, same
  signature. This is the minimum-surface change that lets D-09 test the
  production code path instead of an inline duplicate.
- `packages/domain/src/delivery/index.ts` — re-exports `*`, so `toWeeks` flows
  through to `@sorrel/domain` consumers automatically (no edit needed; the
  barrel already does `export * from "./calendar"`).
- `packages/ui/src/DeliveryDatePicker.tsx` — replace the inline `toWeeks` with
  an import from `@sorrel/domain`. Behavioural no-op; the function body is
  copy-identical. Keeps the UI consuming the same code the domain test pins.

The Phase 1 catalog is reproduced verbatim so this spec is self-contained:

| ID   | Title                                                                                     | Asserts                                                                                                                                                                                           | Catches                                                           |
| ---- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| D-01 | Feb 2024 leap-month grid                                                                  | `buildMonthView(2024, 2, {earliest:"2024-02-01"})` → `leadingBlanks === 3`, `cells.length === 29`, last `iso === "2024-02-29"`                                                                    | Off-by-one leap rendering                                         |
| D-02 | March 2026 after Feb-common handoff                                                       | `buildMonthView(2026, 3, {earliest:"2026-03-01"})` → `leadingBlanks === 6`, `cells.length === 31`, first `iso === "2026-03-01"` (Sunday)                                                          | Feb's 28 leaking into March's `mondayIndex`                       |
| D-03 | January 2026 starts Thursday                                                              | `buildMonthView(2026, 1, {earliest:"2026-01-01"})` → `leadingBlanks === 3`, `cells.length === 31`                                                                                                 | Year-boundary regression in `mondayIndex("YYYY-01-01")`           |
| D-04 | DST spring-forward stays a single ISO day                                                 | `addDays("2026-03-28", 1) === "2026-03-29"` AND `mondayIndex("2026-03-29") === 6` (Sunday)                                                                                                        | A naïve local-time `addDays` skipping or duplicating the DST day  |
| D-05 | `earliestDeliverableDate` Thu+4 ⇒ Mon                                                     | `earliestDeliverableDate("2026-06-11", 4) === "2026-06-15"`                                                                                                                                       | While-loop firing when it shouldn't                               |
| D-06 | `earliestDeliverableDate` Tue→Wed one-step skip                                           | `earliestDeliverableDate("2026-06-13", 3) === "2026-06-17"` (Sat+3 = Tue 16 blocked → Wed 17)                                                                                                     | Off-by-one in the skip loop                                       |
| D-07 | `moveFocus` Sunday + `End` is a no-op                                                     | `moveFocus("2026-06-21", "End", 2026, 6) === "2026-06-21"`                                                                                                                                        | `End` leaking into next week                                      |
| D-08 | `IsoDate` UTC round-trip under a `process.env.TZ` shim                                    | With `process.env.TZ = "America/New_York"` set in a `beforeAll` and restored in `afterAll`, `toIso(parseIso("2026-01-01")) === "2026-01-01"` and `toIso(parseIso("2026-06-15")) === "2026-06-15"` | Any local-time `getDate` / `getMonth` regression in `calendar.ts` |
| D-09 | `toWeeks` pads the last row to 7                                                          | Import `toWeeks` from `@sorrel/domain`. For June 2026: last week's non-null days are `[29, 30]`, trailing `null` count is `5`, every row has length `7`.                                          | Padding loop breaking (`while (week.length < 7) week.push(null)`) |
| D-10 | Property: `earliestDeliverableDate` never lands on a blocked weekday over a 365-day sweep | Loop `today` from `2026-01-01` through `2026-12-31` (one ISO per day via `addDays`); for each, assert `isDeliverableWeekday(earliestDeliverableDate(today))` is `true`                            | Weekday-pattern regression in the skip loop                       |

# Contract impact

Additive only.

- `packages/domain/src/delivery/calendar.ts` gains one new export:

  ```ts
  export function toWeeks<T>(leadingBlanks: number, cells: readonly T[]): (T | null)[][];
  ```

  The body is copy-identical to the current
  `packages/ui/src/DeliveryDatePicker.tsx:362-368` helper. Existing callers in
  the UI swap their local definition for the import. No type-generation
  consequence (this is plain TS, not GraphQL).

- `packages/domain/src/delivery/index.ts` already does `export * from
"./calendar"`, so `toWeeks` flows through `@sorrel/domain` automatically — no
  edit to the barrel.

- `schema.graphql`: no change.
- `packages/analytics`: no change.
- No new npm dependencies. `process.env.TZ` is a Node built-in.

The TZ shim chosen for D-08 is `process.env.TZ = "America/New_York"` set in
`beforeAll` and restored in `afterAll`. Rationale: this survives jest-worker
boundaries (jest forks workers; the env var is inherited), whereas mocking the
`Date` constructor leaks into unrelated tests and breaks if a later refactor
imports `dayjs` or `temporal`. The shim is local to the new `describe` block.

`toWeeks` export choice (recommendation in the gap brief: option (a)). Keeping
the in-component duplicate (option (b)) was the right call for spec 024
because spec 024 was scoped to the test suite only. Now that we are explicitly
chasing the drift between the UI helper and the test helper, exporting it from
`@sorrel/domain` is the smaller surface change long-term: one definition, one
test, one import.

# Out of scope

- Any UI test work — Phase 2 cases (U-01 … U-29) ride spec 025 / 028 / 029 or
  a separate UI-polish spec. This spec does not touch
  `packages/ui/src/DeliveryDatePicker.test.tsx`.
- Cypress bootstrap or any Phase 3 case (C-01 … C-24). Those ride a separate
  Cypress-bootstrap spec.
- Branding `IsoDate` as a nominal type (the code-quality review's "one TS gap").
  Tracked as an optional Phase 4 follow-on; not in this spec.
- Any change to `earliestDeliverableDate`, `blockedInfo`, `buildMonthView`,
  `moveFocus`, or `clampToMonth` production code. This spec is test-only
  except for the `toWeeks` re-export plumbing.
- Any change to `services/api` or `apps/web`.

# Acceptance criteria

- [ ] `yarn type-check` green (0 errors / 0 warnings) per
      `.claude/rules/verification.md`.
- [ ] `yarn lint` green (0 errors / 0 warnings).
- [ ] `yarn workspace @sorrel/domain test` green; new file shows **38** passing
      cases (28 existing + 10 new D-01 … D-10).
- [ ] All ten new cases live in `packages/domain/src/delivery/calendar.test.ts`
      and are titled to match D-01 … D-10 in the table above so the spec and
      the suite are traceable.
- [ ] `toWeeks` is exported from `@sorrel/domain` and the duplicate in
      `packages/ui/src/DeliveryDatePicker.tsx:362-368` is removed and replaced
      with an import.
- [ ] `packages/ui` builds (its consumer of `toWeeks` resolves through the
      barrel).
- [ ] The D-08 `describe` block uses `beforeAll(() => { process.env.TZ =
"America/New_York"; })` and a matching `afterAll` that restores the
      previous value (capture into a `const` before the override).
- [ ] D-10 uses `addDays` to walk the year-long sweep — no `for (let d=0; …)`
      raw counter — so the sweep proves `addDays` itself is iteration-stable
      across DST and year boundaries.
- [ ] No production behaviour change. The existing 28 cases stay byte-for-byte
      identical (the inline `toWeeks` copy in the June-2026 case is replaced
      with the imported `toWeeks` in the same assertion shape).
- [ ] Commit subject includes the `Spec: 030` trailer.

# Analytics

None. This is a domain-only suite extension; no funnel events fire.
