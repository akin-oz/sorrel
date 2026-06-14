---
spec: 023
title: Make /insights read live PostHog funnel data with a static fallback, and finish the pills re-narration
status: proposed
approved: yes
tier: 1 # the 39→65 conversion narrative + its live evidence surface
owner: apps/web
---

> Numbering note: this **replaces** the earlier draft `023-re-narrate-profile-ab-pills-vs-autocomplete.md`
> (same `spec: 023`), folding that re-narration into a larger change: the `/insights`
> page becomes a **live PostHog read** with a deterministic static fallback. The
> highest committed spec is 022; this is its evidence-surface follow-on.

# Problem / gap

Two gaps, one surface.

1. **`/insights` is a static synthetic file, not the live funnel.** The page
   (`apps/web/app/[locale]/insights/page.tsx`) imports `apps/web/lib/insights-data.json`
   at build time and renders it verbatim. The PostHog project already holds the **real**
   variant-split funnel: a `FunnelsQuery` on `funnel_step_viewed` returns **A 25.58% vs
   B 36.33%** completion (300/301 sessions per arm, plus one organic no-`variant` session).
   Every funnel event carries `step`, `variant`, and a `seed` boolean — enough to run the
   7-step `funnel_step_viewed` funnel broken down by `variant` over the Query API. The page
   should read that live data when a server key is present, and fall back to the static JSON
   otherwise (so CI/offline builds with no key stay deterministic and green). No spec covers
   reading PostHog from the server today: spec 014 produced the static JSON; specs 010/014
   only set up the client-side `phc_` ingestion key, which cannot query.

2. **The Insights copy + seed still say "free text" (a live doc-vs-reality mismatch).**
   Spec 022 (approved) changed PROFILE **variant A** from free-text age/weight inputs to
   **inline single-select toggle pills** and dropped the per-field `field_error` for the
   pills (the spec-020 disabled-Continue gate already flags an unselected age/weight as
   `"required"`). But 022 left the downstream re-narration out of scope ("Re-seeding /
   re-narrating the demo (flagged, not done here)"). So today:
   - `apps/web/messages/en.json` + `de.json` → `Insights.variantA` (`"A · free text"` /
     `"A · Freitext"`) and `Insights.subtitle` still frame A as friction, not a credible
     control.
   - `apps/web/scripts/seed-funnel.ts` → `RETENTION.A = [0.82, 0.55, 0.81, 0.89, 0.86, 0.91]`:
     index 1 (PROFILE→RECIPES) is the free-text-friction stall (`0.55`). This script
     generates `insights-data.json`. **It does not itself emit `field_error`.**
   - `apps/web/scripts/seed-mixpanel.ts` + `seed-posthog.ts` → push the same curve to the
     live demo dashboards **and** emit an arm-A `field_error` at PROFILE (the
     `if (FUNNEL_STEPS[i] === "PROFILE" && variant === "A" && index % 3 === 0)` block in
     each, plus a "free-text inputs fail validation" header comment). Pills no longer emit a
     per-field error per spec 022, so that synthetic volume is now fiction for the control.
   - `README.md` line ~67 ("Autocomplete with smart defaults vs. **free text**") and line
     ~129 ("variant A ≈26% → B ≈36% completion").

This spec makes `/insights` live (with a static fallback) and finishes the pills
re-narration so both the static fallback and the live demo tell the **pills-vs-autocomplete**
story.

# Scope

Server-only live fetch + ISR + static fallback on `/insights`, plus the 022 follow-on
re-narration (copy + seed). No funnel-component change, no contract change.

## 1 — Live PostHog fetch (new server-only module)

**File (new):** `apps/web/lib/insights-posthog.ts` — **server-only** (no `"use client"`,
never imported by a client component).

- Calls the PostHog **Query API**: `POST {host}/api/projects/{projectId}/query`, body
  `{ query: FunnelsQuery }`, with `Authorization: Bearer ${POSTHOG_PERSONAL_API_KEY}`.
  Uses the platform `fetch` — **no new npm dependency**.
- Runs the 7-step `funnel_step_viewed` funnel — one series per `step` value in funnel order
  `CATS → PROFILE → RECIPES → DELIVERY → PLAN → EMAIL → SUMMARY` (driven by `FUNNEL_STEPS`
  from `@sorrel/shared`, so the step set never drifts), `funnelOrderType: "ordered"`,
  a `dateRange` (e.g. last 90d) — **broken down by `variant`**.
- Maps the PostHog response into the page's **existing shape**:
  `{ sessionsPerVariant, steps, variants: { A: { viewed: number[]; completionRate }, B: {…} } }`
  (the same object `insights-data.json` already provides). The step `viewed[]` array is the
  per-step funnel count for that variant; `completionRate = viewed[last] / viewed[0]`.
- **Returns `null` on any failure** — missing key, non-200, unparseable body, or **zero
  rows** — so the caller can fall back without a thrown error. No throw, no ghost UI.
- **Seed population — DECISION (see below):** include seeded **and** organic events by
  default (gives the demo its volume), exposing an option in the module to filter `seed = false`
  for organic-only.

## 2 — Page wiring: live-or-fallback + ISR

**File:** `apps/web/app/[locale]/insights/page.tsx`.

- Attempt the live read; if it returns a value, render it; **else** fall back to the existing
  `apps/web/lib/insights-data.json` import. No new loading/error UI beyond the current render
  (the no-ghost-UI rule — the fallback is the "error" state).
- Add ISR: `export const revalidate = 3600` so the page is fast and does not hammer the Query
  API on every request.
- The page is already App\*-migrated (specs 018) — **no `sx`, no `@mui`**. Keep it that way;
  the `funnel(...)` / `stat(...)` render helpers and the `liftPp` computation are unchanged,
  they just consume whichever source won.

## 3 — Re-narration: Insights copy (en + de)

**Files:** `apps/web/messages/en.json`, `apps/web/messages/de.json` (the `Insights` namespace).

- `Insights.variantA` — change `"A · free text"` / `"A · Freitext"` to the pills label.
  **Recommendation: `"A · pills"`** (de: `"A · Pills"`) — shortest, reads cleanly in the
  `${variantA} · ${completion}` stat the page composes (`page.tsx` lines 87–92, 97).
  `variantB` (`"B · autocomplete"` / `"B · Autovervollständigung"`) is unchanged.
- `Insights.subtitle` — reframe from friction-vs-no-friction to a **credible UX test**:
  visible-options pills (A) vs autocomplete-with-defaults (B), B still lifting PROFILE→RECIPES.
  Recommended en: `"Live PostHog sessions, split by the PROFILE-input A/B test. Variant A
shows every option as inline pills; variant B uses autocomplete with smart defaults. Even
against a credible visible-options control, B lifts the PROFILE → RECIPES step — the 39→65
lever."` with the matching de translation. (If the reviewer prefers the subtitle to stay
  source-agnostic so the static-fallback build reads truthfully, keep "Synthetic sessions"
  wording — see decisions.) No other `Insights` keys change.

## 4 — Re-seed to the pills curve

**File:** `apps/web/scripts/seed-funnel.ts` (the canonical model).

- Update `RETENTION.A` so the control is **lower-friction than free text was**: raise index 1
  (PROFILE→RECIPES) from `0.55` toward B's `0.78`, leaving `RETENTION.B` unchanged so B still
  wins. The A/B gap shrinks but stays positive (the honest outcome of a credible control).
  See the numbers decision below for the recommended exact value.
- Update the header comment block and the inline `RETENTION` comment (currently "free-text (A)
  stalls; autocomplete-with-defaults (B) lifts") to describe pills-vs-autocomplete.
- Regenerate `apps/web/lib/insights-data.json` by running the seed script (it writes the file).
  **JSON is regenerated by the script, never hand-edited** — this stays the deterministic
  static fallback.

**Files:** `apps/web/scripts/seed-mixpanel.ts`, `apps/web/scripts/seed-posthog.ts`.

- Mirror the new `RETENTION.A` vector in both (each holds its own copy that must match the
  canonical curve).
- **Remove the arm-A `field_error` emission at PROFILE** — the
  `if (… variant === "A" && index % 3 === 0) { send({ name: "field_error", step: "PROFILE", … }) }`
  block in each script (and its "free-text inputs fail validation" comment). Pills emit no
  per-field error per spec 022; the signal is the spec-020 disabled-Continue gate. (`seed-funnel.ts`
  does not emit `field_error`, so nothing changes there.)
- Update both header comments (each currently says the free-text control "also throws more
  validation `field_error`s at PROFILE — the friction the experiment removes").
- **Re-running** `seed:posthog` (+ `seed:mixpanel`) against the live projects so the live
  funnel tells the pills story is an **operational step the owner runs** — see Out of scope.

## 5 — Env / secret

**Files:** the env documentation surface (README analytics section; `apps/web/.env` is the
runtime read site — there is no committed `.env.example`).

- Document a new **server-only** secret `POSTHOG_PERSONAL_API_KEY` plus `POSTHOG_PROJECT_ID`,
  reusing the existing EU host (`NEXT_PUBLIC_POSTHOG_HOST`, default `https://eu.i.posthog.com`).
- It is **NOT** `NEXT_PUBLIC_*` and must never reach the client. The public `phc_` ingestion
  key (`NEXT_PUBLIC_POSTHOG_KEY`) **cannot** run queries — that is why a separate personal key
  is required.
- Operational note for the owner: create the key in PostHog (Settings → Personal API keys,
  scope `query:read`), add `POSTHOG_PERSONAL_API_KEY` + `POSTHOG_PROJECT_ID` to `apps/web/.env`
  and the Vercel project. With no key set, the page builds and renders on the static fallback.

## 6 — README

**File:** `README.md`.

- Line ~67: change "Autocomplete with smart defaults vs. **free text**" to "Autocomplete with
  smart defaults vs. **inline pills (all options visible)**" (or wording matching the chosen
  variant-A label).
- Line ~129: update "variant A ≈26% → B ≈36% completion" to the new figures from the
  regenerated JSON (e.g. "variant A ≈31% → B ≈36% completion" — final number set by the
  numbers decision below). Optionally note `/insights` now reads live PostHog with a static
  fallback.

# Contract impact

**None.** No `schema.graphql` change, no `packages/domain` change. The typed `FunnelEvent`
contract (`@sorrel/analytics`, spec 009 — `FunnelStepViewed` carries `step` + optional
`variant`) is untouched: no new event types, no new props, no new `error` codes. Removing
seeded `field_error` calls only reduces synthetic event volume; it does not alter the contract.
The live-fetch module reads PostHog's REST Query API — it does **not** touch
`schema.graphql` (that is the app's own GraphQL contract) and adds no generated types. The
only new external surface is the env secret.

# Out of scope

- **Re-running the live `seed:posthog` / `seed:mixpanel` scripts against the demo projects.**
  The code is updated here; actually ingesting the new curve into the live PostHog (EU) and
  Mixpanel projects requires tokens and is an **operational step the owner runs** after this
  lands. The scripts are deterministic (stable `$insert_id`s), so a re-run dedups rather than
  doubling counts — but the act of re-seeding is not part of the merge.
- **The PROFILE funnel components** (`ProfileForm.tsx`, `AppToggleGroup`) — the pills UI
  shipped in spec 022; this spec touches only copy, seed data, the page wiring, and the new
  server module.
- **Variant B** (autocomplete + smart defaults) — its `RETENTION.B` curve and copy unchanged.
- **The `useVariant` bucketing / `profile-input` flag source** — unchanged.
- **Writing to PostHog from the app**, dashboards, retention/path queries, or any analytics
  query beyond the single 7-step funnel breakdown the page renders.
- **Caching/secret infrastructure** beyond Next's built-in ISR (`revalidate`) and a plain
  env var — no Redis, no new SDK, no edge config.
- **New analytics events, schema, domain logic, or external npm dependencies** — none.

# New dependencies

None. The live fetch uses the platform `fetch`. The only new external surface is the
server-only env secret `POSTHOG_PERSONAL_API_KEY` (+ `POSTHOG_PROJECT_ID`).

# Decisions for the reviewer

1. **The new completion numbers (the load-bearing call).** Proposed: raise `RETENTION.A[1]`
   (PROFILE→RECIPES) from `0.55` to **`0.70`**, leaving every other A index and all of B
   unchanged — so `RETENTION.A = [0.82, 0.70, 0.81, 0.89, 0.86, 0.91]`. With the existing
   `viewedCounts` rounding and 1000 sessions/variant this yields A `completionRate ≈ 0.325`
   (vs B `0.36`), shrinking the absolute lift from `+10.5 pp` to `≈ +3.5 pp`. Story: "even
   against a credible visible-options control, autocomplete-with-defaults still lifts
   PROFILE→RECIPES." The reviewer confirms or adjusts the single value `RETENTION.A[1]` (the
   exact A figure follows from the regenerated JSON, not a hand-typed number).
2. **Live query population.** Include seeded **and** organic events (recommended — gives the
   demo volume, matches the 300/301-per-arm picture already in PostHog) vs filter `seed = false`
   for organic-only. Recommendation: include-all, with the filter exposed as a module option.
3. **Variant-A label wording** (en + de): `"A · pills"` (recommended) vs `"A · visible options"`
   vs `"A · inline pills"`.
4. **ISR window + fallback trigger.** `revalidate = 3600` (recommended); fall back to the
   static JSON when the live read returns `null` (no key **OR** non-200 **OR** zero rows).
5. **Subtitle wording vs the static-fallback build.** The recommended subtitle says "Live
   PostHog sessions". On a keyless CI build the page renders the static JSON, so that wording
   would be slightly inaccurate there. Reviewer picks: accept the live-framed copy (the demo
   deploy has the key) **or** keep source-agnostic "Synthetic sessions" wording.

# Acceptance criteria

- [ ] New `apps/web/lib/insights-posthog.ts` is **server-only** (no `"use client"`; never
      imported by a client component) and is **not** prefixed `NEXT_PUBLIC_*` anywhere it
      reads the personal key
- [ ] The module POSTs `{ query: FunnelsQuery }` to `{host}/api/projects/{projectId}/query`
      with a Bearer personal key via the platform `fetch` (no new npm dependency), runs the
      7-step `funnel_step_viewed` funnel (steps from `FUNNEL_STEPS`, `ordered`) broken down by
      `variant`, and maps to the page's existing `{ sessionsPerVariant, steps, variants }` shape
- [ ] The module returns `null` on missing key, non-200, parse failure, or zero rows — no throw
- [ ] `/insights` renders live data when the key is present and **falls back to
      `insights-data.json`** otherwise; no new loading/error UI states
- [ ] `export const revalidate = 3600` (or the reviewer's window) is set on the page
- [ ] CI / keyless `next build` is **green on the fallback** (deterministic static JSON)
- [ ] `Insights.variantA` no longer says "free text"/"Freitext" in **either** `en.json` or
      `de.json`; it uses the reviewer-chosen pills label in both
- [ ] `Insights.subtitle` reframes A as inline pills and B as autocomplete-with-defaults (a
      credible UX test, B still the lift), in **both** en and de
- [ ] `seed-funnel.ts` `RETENTION.A` updated per the numbers decision; comments describe
      pills-vs-autocomplete; `RETENTION.B` unchanged
- [ ] `apps/web/lib/insights-data.json` is **regenerated by the seed script** (not hand-edited)
      and reflects the new A curve; B figures unchanged
- [ ] `seed-mixpanel.ts` + `seed-posthog.ts` `RETENTION.A` matches the canonical curve; the
      arm-A PROFILE `field_error` block is **removed** in both; their header comments updated
- [ ] `POSTHOG_PERSONAL_API_KEY` + `POSTHOG_PROJECT_ID` documented as server-only secrets
      (env docs / README), explicitly **not** `NEXT_PUBLIC_*`, with the PostHog
      `query:read` key-creation step noted
- [ ] README line ~67 ("free text") and line ~129 ("variant A ≈26%") updated to the pills
      framing and the new completion figure
- [ ] The typed `FunnelEvent` contract (`@sorrel/analytics`) is unchanged — no new events,
      props, or `error` codes; no `schema.graphql` / `packages/domain` change
- [ ] `apps/web` stays App\*-only — no `sx`, no `@mui` introduced (spec 018)
- [ ] Seed determinism preserved — the regenerated `insights-data.json` is stable across
      re-runs (no RNG); the live-seed `$insert_id`s remain stable so a future re-seed dedups
- [ ] `yarn type-check` + `yarn lint` + `next build` green; existing tests (incl. domain and
      the `FunnelStep` schema-sync test) stay green
- [ ] No real-brand names/assets; the word "bait" appears nowhere

# Analytics

No new event types and no contract change. The live read **consumes** existing telemetry: it
queries the already-emitted `funnel_step_viewed` events (each carrying `step` + `variant`)
through PostHog's funnel query — it emits nothing. The seed pipeline keeps firing
`funnel_step_viewed` / `step_completed` (with `variant`) and `funnel_abandoned` (with `step`)
via the spec-009 typed `createTracker`; only the **A/B drop-off ratios shift** (variant A
retains more at PROFILE→RECIPES). The synthetic arm-A `field_error` (`step:"PROFILE"`,
`field:"age"|"weight"`, `error:"required"`) emitted by `seed-mixpanel.ts` / `seed-posthog.ts`
is **removed**, aligning the demo with spec 022's step-gate-only signal — the pills no longer
produce per-field errors. `exit_intent_shown` / `exit_intent_recovered` seeding is unchanged.
