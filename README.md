# 🐾 Sorrel — fresh, vet-formulated food for cats

A mobile-first subscription **onboarding funnel**, built as an engineering artifact.

**▶ Live demo: [sorrel.akinoztorun.dev](https://sorrel.akinoztorun.dev/)**

> **Status: 🚧 work in progress.** Landed: the monorepo + AI-governance workflow, the
> GraphQL contract with a mock Apollo API, the typed analytics contract, and the **wizard
> shell** — all seven steps routed and instrumented, with local resume, an exit-intent
> recovery modal, and the delivery-date picker wired into step 4. Now **bilingual (en/de,
> next-intl)** end to end, and the landing + recipes are **CMS-driven via Storyblok** (visual
> editing, draft preview, on-publish revalidation), with a typed offline fallback. **Deployed
> on Vercel.** In active build: the per-step input forms and the Apollo write-path. See
> [Roadmap](#roadmap).

> _Sorrel is a fictional brand created for this demo. No real company, product, or
> brand assets are referenced anywhere in this repository._

---

## Thesis

**Conversion is an engineering discipline: instrument, find the step, fix the step,
lock it with budgets.**

This repo applies the same method that took a real onboarding funnel from **39% → 65%
completion** (employer unnamed) to a subscription flow's shape. The product is a fresh
cat-food signup wizard; the interesting part is the _method_ — every step is a clean,
measured analytics unit, every UX decision has an expected effect and a way to verify it,
and quality is enforced by hooks and budgets rather than by hope.

---

## The funnel

A URL-segmented wizard (`/wizard/[step]`) — deep-linkable, correct back-button
behaviour, each step its own analytics unit.

1. **Quantity of cats** — how many cats to feed.
2. **Cat profile** — name, age, weight (a lean slice of the schema's richer cat — see
   [Decisions](#decisions)). _The conversion lever:_ toggle pills (variant A) vs. searchable
   autocomplete with smart defaults (variant B), behind a flag. This is the 39→65 fix, made
   demoable.
3. **Recipe selection** — cards with dietary filters.
4. **Delivery date** — the [date-picker centerpiece](#the-delivery-date-picker).
5. **Plan & price** — optimistic price preview while the mutation is in flight.
6. **Email capture** — server action with server-side validation.
7. **Checkout summary** — order review.

Cross-cutting: typed funnel events (`funnel_step_viewed`, `step_completed`,
`field_error`, `funnel_abandoned`, `exit_intent_shown` / `exit_intent_recovered`),
abandonment recovery (local-draft resume today; the `saveFunnelDraft` server sync follows
with the Apollo write-path), and a planned seed script for a realistic drop-off curve.

_Today the shell routes and instruments all seven steps with the picker wired into step 4;
the input forms themselves land step by step (each its own approved spec)._

---

## Decisions

A few load-bearing decisions — each names its **expected effect** and **how it's
measured**. The instrument is the typed analytics contract, not opinion.

- **URL-segmented steps** (`/wizard/[step]`) → clean per-step attribution → measured by
  `funnel_step_viewed` → `step_completed` drop-off per step.
- **Autocomplete with smart defaults vs. inline pills (all options visible)**, behind a flag
  → a credible A/B at the step that drops the most → measured by `step_completed` split by
  `variant`.
- **Local draft + `saveFunnelDraft` server autosave** → recover abandoned sessions
  → measured by resume rate after `funnel_abandoned`.
- **Exit-intent recovery modal** (desktop) → intercept the abandonment gesture with a reason
  to stay → measured by recovery rate (`exit_intent_recovered ÷ exit_intent_shown`).
- **A lean funnel over the full schema** → the wizard asks only what drives a credible plan
  (name, an age/weight bucket, recipes, cadence, email). `schema.graphql` models the _whole_
  domain — `neutered`, `fussiness`, `allergies`, and clinical dietary programs behind a
  veterinary-confirmation gate — and the web→GraphQL boundary
  ([`draft-input.ts`](apps/web/app/%5Blocale%5D/wizard/draft-input.ts)) fills the unasked
  fields with documented defaults that never change the shown price (the plan depends only on
  weight + age + cadence). Fewer fields, higher completion — the conversion thesis applied to
  the form itself; the schema stays the full contract for when onboarding deepens.

_(Live: [sorrel.akinoztorun.dev](https://sorrel.akinoztorun.dev/). Measured mobile Lighthouse
— landing **93 / 95 / 100 / 92** (perf / a11y / best-practices / SEO), budgeted in CI:
[docs/lighthouse.md](docs/lighthouse.md). Seeded funnel-curve screenshot lands at the Tier-1
exit — see [Roadmap](#roadmap).)_

---

## The delivery date picker

The Tier-1 centerpiece (`packages/ui`) and the design-system proof — one logic shell,
two brand themes. Spec:
[`specs/001-delivery-date-picker.md`](specs/001-delivery-date-picker.md).

- Pre-selected earliest deliverable date; animated modal over an overlay.
- Monday-first grid; blocked weekdays shown, not hidden (`aria-disabled` + reason).
- Accessible by default: focus trap, ESC, return focus, `aria-modal`, keyboard grid nav.
- Three-state exit animation (open → closing → closed) with a reduced-motion fallback.
- Date logic unit-tested across month boundaries.

---

## Architecture

A yarn-workspaces monorepo. Target layout:

```
apps/web            Next.js 16 App Router, React 19, strict TS, MUI
services/api        Apollo Server: recipes, pricing, plans, mutations
packages/ui         Delivery date picker + shared components, two brand themes
packages/domain     Pricing rules, portion calc, plan invariants — unit tested
packages/analytics  Typed funnel-event contract, shared by web and seed scripts
```

**Contracts are the anti-invention mechanism.** `schema.graphql` (GraphQL codegen) and
`packages/domain` are the single sources of truth, so an invented field, prop shape, or
endpoint becomes a compile error before any human reads the diff.

**One analytics contract, swappable destinations.** The funnel is instrumented once
against the typed `FunnelEvent` contract (`packages/analytics`); a thin `AnalyticsSink`
seam fans those events to vendors that never touch the emit sites. **PostHog is the
backend of record** — it owns product analytics, the `profile-input` feature flag the
wizard reads, and the A/B experiment. Mixpanel rides the same seam as a second
destination — one line in `analytics.ts`, zero changes to instrumentation — to prove the
contract is vendor-agnostic, not because two vendors are needed; it's opt-in per
environment (`NEXT_PUBLIC_MIXPANEL_TOKEN`), so production runs single-vendor by default.
Both backends are populated for the demo (`yarn workspace @sorrel/frontend seed:posthog`
/ `seed:mixpanel`), each showing the same CATS→SUMMARY funnel with the PROFILE-input
lever (variant A ≈32% → B ≈36% completion — inline pills are a credible control, so the
gap is real but smaller). The `/insights` page reads the **live** PostHog funnel when a
server-only `POSTHOG_PERSONAL_API_KEY` (+ `POSTHOG_PROJECT_ID`) is set — created in PostHog
with `query:read` scope, never `NEXT_PUBLIC_*`, since the public `phc_` ingestion key can't
query — and falls back to the committed seed JSON otherwise, so keyless builds stay green.

---

## How this was built — the AI workflow

> _I do not prevent the model from being wrong, I make wrong un-mergeable._

This repo is also an exhibit of an agentic engineering workflow. The enforcement lives in
the repository itself, not in a process doc:

- **Spec-gated execution** — features exist only as approved spec files
  ([`specs/`](specs/)). The agent implements only what a human has marked `approved: yes`;
  anything else stops for approval.
- **Rules as contracts** — [`.claude/rules/`](.claude/rules/): no invention outside the
  spec, schema + domain are canonical, no behaviour claims without green checks in the
  same turn.
- **Hooks as enforcement, not vibes** — [`.claude/hooks/`](.claude/hooks/): a `Stop` gate
  runs type-check (and domain tests) and fails the turn if red; a `PreToolUse` guard pauses
  for human approval on the source-of-truth files; every commit must carry a `Spec: NNN`
  trailer.
- **Single-lens review agents** — [`.claude/agents/`](.claude/agents/): contract,
  conversion-instrumentation, accessibility, spec-authoring, and test-writing reviewers.

The git log is the demo: spec → approval → implementation → green checks → merge.

---

## Run it locally

```bash
yarn install
yarn workspace @sorrel/frontend dev   # the funnel at http://localhost:3000/wizard/cats
yarn workspace @sorrel/api dev        # GraphQL mock at http://localhost:4000

yarn type-check        # strict TS across the workspaces (0 errors required)
yarn workspace @sorrel/domain test    # (and @sorrel/api / shared / analytics / frontend)
yarn codegen:check     # fail the build if schema.graphql is invalid
yarn format:check      # formatting
```

---

## Roadmap

Tiers ship in order; nothing ships below the Tier-1 line.

- **Tier 1 — credible core:** wizard steps with typed reducer state, MUI theme, RSC shells
  with client islands, Apollo queries + optimistic mutations, instrumentation firing,
  mobile-first, deployed, mobile Lighthouse budgeted in CI (perf 90–93 · a11y 95 ·
  best-practices 100).
- **Tier 2 — coverage:** CMS-driven landing/recipe content, i18n (en/de) with hreflang,
  CI (typecheck, lint, unit matrix, codegen + format gates, a spec-trailer gate, Lighthouse
  budget — all as PR gates), one Cypress happy path, JSON-LD, sitemap/robots.
- **Tier 3 — closers:** funnel-insights page from seeded events, Storybook, axe checks in
  CI, Stripe test mode.

**Landed:** the monorepo + AI-governance layer (`.claude/` + `specs/`), the delivery-date
picker (`packages/ui`), the GraphQL contract + mock Apollo API (`schema.graphql`,
`services/api`), the typed analytics contract (`packages/analytics`), the wizard shell
(`apps/web`) — routed, instrumented (PostHog behind an env flag), with local resume and an
exit-intent recovery modal — **bilingual en/de (next-intl, hreflang)**, and a **Storyblok**
CMS for the landing + recipes (visual editing, draft preview, on-publish revalidation, typed
bloks, offline fallback). The **Apollo write-path** — a co-located GraphQL endpoint, an
RSC-safe client, the PLAN-step optimistic price preview, `saveFunnelDraft` autosave, and the
EMAIL server action — is wired, with pricing centralised in `packages/domain` behind an
anti-drift guard (spec 013). **CI gates** (the full verify matrix, a spec-trailer gate, and
the Lighthouse mobile budget) and **SEO** (sitemap, robots, Product + FAQ JSON-LD) are in
place (spec 015). **Deployed on Vercel** ([sorrel.akinoztorun.dev](https://sorrel.akinoztorun.dev/)).
**In active build:** the remaining CATS/RECIPES input polish, a Cypress happy path,
Storybook, and Stripe test mode.
