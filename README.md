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
nvm use                # Node 24 — see .nvmrc; yarn refuses on Node 18
yarn install
cp .env.example .env   # then fill the values — see the env table below
yarn workspace @sorrel/frontend dev   # the funnel at http://localhost:3000/wizard/cats
yarn workspace @sorrel/api dev        # GraphQL mock at http://localhost:4000

yarn type-check        # strict TS across the workspaces (0 errors required)
yarn test              # the full unit matrix (alias for yarn workspaces run test)
yarn codegen:check     # fail the build if schema.graphql is invalid
yarn format:check      # formatting
```

### Environment variables (spec 040)

`.env.example` is the canonical template; copy it to `.env` and fill the
values. The build-time keys must also be set in the **Vercel Production +
Preview** environment because Next.js inlines `NEXT_PUBLIC_*` at the moment
`yarn build` runs. Runtime keys only need to live in the Vercel dashboard.

| Class       | Key                                                        | Used by                                                           |
| ----------- | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| Build-time  | `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST`     | Client PostHog SDK (ingestion).                                   |
| Build-time  | `NEXT_PUBLIC_MIXPANEL_TOKEN` / `NEXT_PUBLIC_MIXPANEL_HOST` | Optional second sink.                                             |
| Build-time  | `NEXT_PUBLIC_SITE_URL`                                     | RSC absolute URL fallback. **Production scope only** — see below. |
| Build-time  | `NEXT_PUBLIC_STORYBLOK_PUBLIC_TOKEN`                       | Storyblok Visual Editor bridge.                                   |
| Build-time  | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`                       | The only client-side Stripe surface.                              |
| Server-only | `POSTHOG_PERSONAL_API_KEY` / `POSTHOG_PROJECT_ID`          | `/insights` live funnel read (spec 023).                          |
| Server-only | `POSTHOG_HOST`                                             | Server-side Query API host (spec 040 §4).                         |
| Server-only | `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`              | `/api/checkout/{intent,webhook}` (spec 039).                      |
| Server-only | `STORYBLOK_*` (preview / webhook / PAT / region)           | CMS draft + revalidate paths.                                     |

**Vercel `NEXT_PUBLIC_SITE_URL` scoping.** Set it in the **Production**
environment only; leave it blank on Preview deploys. The Apollo RSC client
falls through to `VERCEL_URL` when `NEXT_PUBLIC_SITE_URL` is absent, so
preview RSC calls hit the preview deploy's own `/api/graphql` rather than
production's.

### Dev-only test hooks

Three `NODE_ENV !== "production"` gated hooks the Cypress suite uses to make the
dev-mode app deterministic. All three are no-ops in production builds.

- **`sorrel_e2e_today` cookie** (spec 034) — server-side override of the picker's SSR
  `today`. Read in `apps/web/app/[locale]/wizard/[step]/page.tsx`. Cypress sets it
  with `cy.setCookie("sorrel_e2e_today", "YYYY-MM-DD")` so the picker's earliest-
  deliverable arithmetic is deterministic across runs.
- **`window.__sorrelVariant`** (spec 032) — pins the PROFILE A/B bucket to `"A"` or
  `"B"`. Read in `apps/web/app/[locale]/wizard/useVariant.ts`. Cypress sets it in
  `cy.visit(..., { onBeforeLoad })` so the happy-path test pins the control branch.
- **`window.__sorrelAnalyticsQueue`** (spec 032) — read-only window mirror of the
  in-memory `memorySink`. Set in `apps/web/app/[locale]/wizard/analytics.ts`. Cypress
  asserts the typed funnel events fired end-to-end against this queue.

### Stripe test mode (spec 039)

The CHECKOUT step uses Stripe's PaymentElement against **test mode only**. The
route handlers pin `apiVersion: "2026-05-27.dahlia"` (the SDK's current
`Stripe.LatestApiVersion`) and rely on `automatic_payment_methods` instead of
the deprecated `payment_method_types` field, per the Stripe MCP best-practice
brief.

**Getting test keys.** If you do not have a Stripe account, install the Stripe
CLI (`npm i -g @stripe/cli`) and run `stripe sandbox create` for a working test
keyset with no registration. Otherwise grab the test keys from the Stripe
Dashboard (test mode toggle, top-right). Set them in `apps/web/.env` or in the
Vercel dashboard:

- **`STRIPE_SECRET_KEY=rk_test_…`** — server-only. Stripe recommends a
  **Restricted API Key (`rk_test_`)** over a secret key (`sk_test_`) so the
  blast radius is limited to PaymentIntent + Webhook scopes. Consumed by
  `/api/checkout/intent` and `/api/checkout/webhook`. **Never** prefix with
  `NEXT_PUBLIC_`. Acceptance: `grep -r rk_test apps/web/.next` against a prod
  build returns nothing.
- **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…`** — the only client-side
  Stripe surface. Read by `CheckoutForm.tsx` via `loadStripe(...)`.
- **`STRIPE_WEBHOOK_SECRET=whsec_…`** — HMAC-verifies the webhook payload. Use
  Stripe CLI's `stripe listen --forward-to localhost:3000/api/checkout/webhook`
  in dev to mint a secret and forward live test events.

**Test cards:** `4242 4242 4242 4242` (always succeeds), `4000 0000 0000 9995`
(decline), any future expiry, any CVC, any postal. Full list:
`stripe:test-cards` skill in this repo's plugin set.

The picker also documents three intentional numbering gaps in the spec sequence
— **021** is rejected-and-deleted (see `specs/022-profile-pills-and-assessment-offer.md`
front-matter); **026** and **027** were burned during the calendar-batch reorganisation
that shipped specs 024 / 025 / 028 / 029.

One historical commit (`25adc13`, spec 031) carries `(spec 031)` only in the subject
without the canonical `Spec: 031` trailer line. The spec-gate workflow regex
(`Spec:[[:space:]]*[0-9]{3}`) would not match it; mitigation is documentation, not
history rewriting (force-pushing `main` is forbidden by the operational rules). The
commit is on `main` via direct push; spec-gate runs on `pull_request:` only, so the
flag never bit at push time. Acknowledged here once so future roadmap audits stop
re-flagging it.

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
- **Tier 3 — closers:** funnel-insights page from seeded events (spec 023, shipped);
  Storybook on the centerpiece + App\* layer (spec 038, shipped — `yarn workspace
@sorrel/ui storybook`); Stripe test-mode CHECKOUT step with PaymentElement
  (spec 039, shipped — uses test card `4242 4242 4242 4242`).
  _(Real-browser axe rules on the calendar dialog shipped under spec 035.)_

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
**Landed since:** the funnel happy path + a calendar-dialog real-browser catalog under
**Cypress** with `cypress-axe` rules on the dialog (specs 032 / 034 / 035), so the
picker is provably real-browser-axe-clean rather than green-by-suppression. **Tracked,
unstarted, no spec:** Storybook, Stripe test mode.
