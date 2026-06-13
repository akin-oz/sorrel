---
spec: 014
title: Funnel evidence — A/B variant end-to-end, seed script, insights page
status: proposed
approved: yes
tier: 1
owner: apps/web · packages/analytics
---

# Problem / gap

The product thesis is _conversion as engineering: instrument → find the step → fix the step →
lock it_, applying the method that took a funnel from 39%→65%. Right now that story is
**scaffolded, not live**:

- The **A/B lever is unmeasurable** — `variant?` is typed in the event contract but **never set
  on a single event**; the chain (flag eval → `variant` prop → splittable) is broken at all three
  links, and PROFILE is an empty placeholder with no inputs.
- **`field_error` is a defined-but-dead event** — zero call sites. (EMAIL wiring lands in 013;
  PROFILE's lands here.)
- **No seed script and no insights page** — the two artifacts a growth reviewer actually looks
  at (the drop-off curve, the A/B lift) don't exist.

This spec makes the lever real and visible — no Apollo dependency, so it ships independently.

# Scope

## PROFILE step — the real A/B form (the 39→65 lever)
- Build PROFILE end-to-end: the two arms behind a flag —
  **variant A** free-text inputs, **variant B** searchable autocomplete with sensible defaults
  (the documented "39→65 fix"). Name / age / weight / neutered / fussiness / allergies, writing
  to funnel state; invalid fields fire `field_error`.
- **Flag source** — a small `useVariant()` reading PostHog feature-flag bucketing when keyed,
  else a deterministic local bucket (so the demo splits without a live vendor).

## `variant` wired end-to-end
- Plumb the resolved `variant` into `funnel_step_viewed` + `step_completed` (the props the
  contract already types) so the funnel is splittable by arm. This closes all three broken links.

## Seed script — the drop-off curve
- A script (consuming `@sorrel/analytics` `FunnelEvent` + `memorySink`) generating synthetic
  sessions with a **realistic drop-off curve split by variant** (B converts higher on
  PROFILE→RECIPES). Output to JSON for the insights page.

## `/insights` page
- A static page rendering the seeded curve + the A/B lift from the JSON (the visible standout).
  Screenshots acceptable as a fallback per the prep's cut order.

## Second sink (vendor breadth)
- A ~25-line `mixpanelSink` beside `posthogSink` (the `AnalyticsSink` seam is one method); the
  app tracker fans events out to every configured vendor. PostHog stays the live funnel +
  experiments source (its MCP — `Create-Experiment`, `Create-Feature-Flag`, `Run-Query` — is
  already connected); Mixpanel is the second destination that demonstrates the seam.

# Contract impact
None to `schema.graphql`. Uses the existing spec-009 event contract (no new event types — only
populates `variant`/`field` props already defined).

# Out of scope (own specs)
- The Apollo write-path + EMAIL server action — spec 013.
- CI/Lighthouse/SEO — spec 015.
- Ghost-state guard on PLAN/SUMMARY (fire `funnel_step_viewed` only once a step is genuinely
  entered) — fold here or 013; flagged so it isn't forgotten.

# New dependencies (flagged for approval)
| Package | Type | Reason |
|---|---|---|
| `mixpanel-browser` (+ `@types/mixpanel-browser`) | dep / devDep (`apps/web`) | the second analytics sink |
| `tsx` | devDep (root) | TS runner for the seed script (`ts-node/esm` hits a require-cycle on Node 24) |

# Acceptance criteria
- [ ] PROFILE renders both A/B arms behind a flag, with real inputs + validation; `field_error` fires
- [ ] `variant` is set on `funnel_step_viewed` + `step_completed` — the funnel is splittable by arm
- [ ] Seed script emits a variant-split drop-off curve to JSON (deterministic, offline)
- [ ] `/insights` renders the curve + A/B lift from the seeded JSON
- [ ] `mixpanelSink` added behind the sink seam; the tracker fans out to every configured vendor
- [ ] `yarn type-check` + `yarn lint` clean; tests green; `next build` green
- [ ] No real-brand names/assets; testimonials/figures clearly illustrative

# Analytics
This spec **populates** `variant` on viewed/completed and fires `field_error` on PROFILE — the
contract's two previously-dead props, now live.
