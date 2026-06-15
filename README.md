# 🐾 Sorrel — fresh, vet-formulated food for cats

A mobile-first subscription **onboarding funnel**, built as an engineering artifact for a
conversion-engineering role.

**▶ Live funnel — [sorrel.akinoztorun.dev](https://sorrel.akinoztorun.dev/)**
&nbsp;·&nbsp; **📒 Live Storybook — [sorrel-ui.akinoztorun.dev](https://sorrel-ui.akinoztorun.dev/)**

> _Sorrel is a fictional brand created for this demo. No real company, product, or brand
> assets are referenced anywhere in this repository._

---

## Thesis

**Conversion is an engineering discipline: instrument, find the step, fix the step, lock it
with budgets.**

This repo applies the method that took a real onboarding funnel from **39% → 65% completion**
(prior work; employer unnamed) to a subscription signup. The product is a fresh cat-food
wizard; the interesting part is the _method_ — every step is a clean, measured analytics
unit, every UX decision names an expected effect and a way to verify it, and quality is
enforced by hooks and budgets rather than by hope.

Two things make the demo honest rather than decorative:

- The whole funnel runs end to end and is **deployed**, bilingual, and CMS-driven.
- The conversion claim is **instrumented** — a typed event contract, a real A/B, and an
  `/insights` page that reads live PostHog (with a seeded fallback) so the numbers are
  reproducible, not asserted.

---

## The funnel

A URL-segmented wizard (`/wizard/[step]`) — deep-linkable, correct back-button behaviour,
each step its own analytics unit.

1. **Cats** — how many cats to feed.
2. **Profile** — name, age, weight (a lean slice of the schema's richer cat — see
   [Decisions](#decisions)). _The conversion lever:_ variant **A** shows every option as
   inline pills; variant **B** uses pre-filled `select` dropdowns with smart defaults — split
   behind a PostHog flag. This is the 39→65 fix, made demoable.
3. **Recipes** — cards with dietary filters, CMS-driven.
4. **Delivery date** — the [date-picker centerpiece](#the-delivery-date-picker).
5. **Plan & price** — optimistic price preview (`useOptimistic`) while the mutation is in
   flight; the authoritative price always comes from `packages/domain`.
6. **Email** — a server action with server-side validation (`useActionState`).
7. **Summary** — review the assembled plan and confirm.
8. **Checkout** — Stripe **test-mode** PaymentElement; the server re-derives the price and
   creates the PaymentIntent, the client never sends an amount.

Cross-cutting, all typed in `packages/analytics`: `funnel_step_viewed`, `step_completed`,
`field_error` (machine codes, not display copy), `funnel_abandoned`,
`exit_intent_shown` / `exit_intent_recovered`, and the checkout leg's
`payment_intent_created` / `payment_succeeded` / `payment_failed`. Abandonment recovery is
two-tier: local-draft resume on reload, plus a `saveFunnelDraft` server autosave through the
Apollo write-path.

---

## Conversion instrumentation

The conversion story is backed by code, not prose:

- **One typed event contract.** `FunnelEvent` (`packages/analytics/src/events.ts`) is a
  discriminated union — a typo'd event name or a missing prop is a compile error, and the
  contract is exhaustiveness-checked by a test.
- **Vendor-agnostic sink seam.** The funnel is instrumented once; a thin `AnalyticsSink`
  fans each event to destinations that never touch the emit sites.
  [`apps/web/.../wizard/analytics.ts`](apps/web/app/%5Blocale%5D/wizard/analytics.ts).
  **PostHog is the backend of record** — it owns product analytics, the `profile-input`
  feature flag the wizard reads, and the A/B experiment. **Mixpanel** rides the same seam as
  an opt-in second destination (`NEXT_PUBLIC_MIXPANEL_TOKEN`) — one line, zero changes to
  instrumentation — to prove the contract is vendor-agnostic. Production runs single-vendor
  by default.
- **A valid A/B.** One stable per-session bucket; the variant is captured on the PROFILE view
  **and** its completion (and carried through to checkout). The first step's view is held up
  to 750 ms for the PostHog flag to settle, then fails open, so no session lands in an
  unattributed `variant: undefined` cohort.
- **Exit-intent + resume** are measurable: `exit_intent_recovered ÷ exit_intent_shown`, and
  resume rate after `funnel_abandoned` (measured in aggregate — `funnel_abandoned` is not
  variant-tagged by design).
- **`/insights` reads live PostHog**, with a deterministic seed fallback. When a server-only
  `POSTHOG_PERSONAL_API_KEY` (+ `POSTHOG_PROJECT_ID`, `query:read` scope — never a
  `NEXT_PUBLIC_*` key) is set, the page runs the variant-split funnel query against PostHog's
  Query API; otherwise it renders committed seed JSON. The page labels its source, so keyless
  builds stay green and never imply live traffic.

**The demo numbers are seeded, and say so.** Both backends are populated for the demo
(`yarn workspace @sorrel/frontend seed:posthog` / `seed:mixpanel`), each replaying the same
CATS→CHECKOUT funnel over **1,000 sessions per variant**. The seeded completion-through-
checkout is **variant A ≈24.3% → B ≈27.0% (+2.7 pp)** — inline pills are a credible control,
so the gap is real but modest. These are synthetic sessions for a reproducible demo, not
production traffic; the live `/insights` read layers any organic traffic on top and labels it
as such.

---

## The delivery date picker

The Tier-1 centerpiece (`packages/ui`) and the design-system proof — **one logic shell, two
brand themes** — explorable in the **[live Storybook](https://sorrel-ui.akinoztorun.dev/)**.
Spec: [`specs/001-delivery-date-picker.md`](specs/001-delivery-date-picker.md).

- Pre-selected earliest deliverable date; animated modal over a scrim.
- Monday-first grid; blocked weekdays shown, not hidden (`aria-disabled` + reason).
- Screen-reader complete: focus trap, ESC, return-focus, `aria-modal`, roving-tabindex grid
  navigation, `inert`-neutralised background, and a polite live region announcing the draft
  selection and blocked-day reasons.
- Three-state exit animation (`open → closing → closed`) with a `prefers-reduced-motion`
  fallback that collapses the animation to ~1 ms while still firing `animationend`, plus a
  safety-net timer so the modal can never stick in `closing`.
- Date logic lives in `packages/domain` (an ESLint rule forbids inlining calendar math in
  the UI) and is unit-tested across month, year, leap, and DST boundaries.
- Proven clean by `jest-axe` in both themes **and** by real-browser `cypress-axe` (computed
  contrast, real focus rings, real `inert`) — not green-by-suppression.

The same picker renders the **Sorrel** and **Bramble** skins from a single token swap; the
structural layout, keyboard model, and ARIA are identical across both.

---

## Architecture

A yarn-workspaces monorepo:

```
apps/web            Next.js 16 App Router, React 19, strict TS; MUI via the App* layer
services/api        Apollo Server: recipes, pricing, plans, mutations (schema-mocked)
packages/ui         Delivery date picker + the App* component layer, two brand themes
packages/domain     Pricing rules, portion calc, plan invariants — unit tested
packages/analytics  Typed funnel-event contract, shared by web and seed scripts
packages/shared     Cross-cut types (the funnel-step tuple), schema-synced by a test
```

**Contracts are the anti-invention mechanism.** `schema.graphql` (GraphQL codegen,
per-consumer) and `packages/domain` are the single sources of truth — so an invented field,
prop shape, or endpoint becomes a compile error before any human reads the diff. The domain
math lives only in `packages/domain`; neither `services/api` nor `apps/web` re-implements it
(a guard hook enforces this, after `computePlan` once drifted into the API).

**MUI behind an intent layer.** `apps/web` carries **no `sx` props and no direct `@mui`
imports** — UI intent is expressed through the `App*` component layer in
`packages/ui/src/app` (`AppButton`, `AppField`, `AppToggleGroup`, …), whose typed props omit
`sx` entirely. One token source, two skins, swappable at the prop boundary.

---

## How this was built — the AI workflow

> _I do not prevent the model from being wrong, I make wrong un-mergeable._

This repo is also an exhibit of an agentic engineering workflow. The enforcement lives in the
repository, not in a process doc:

- **Spec-gated execution** — features exist only as approved spec files
  ([`specs/`](specs/)). The agent implements only what a human has marked `approved: yes`;
  anything else stops for approval.
- **Rules as contracts** — [`.claude/rules/`](.claude/rules/): no invention outside the spec,
  schema + domain are canonical, no behaviour claims without green checks in the same turn.
- **Hooks as enforcement, not vibes** — [`.claude/hooks/`](.claude/hooks/): a `Stop` gate
  runs type-check + domain tests and fails the turn if red; a `PreToolUse` guard pauses for
  human approval on the source-of-truth files; every commit must carry a `Spec: NNN` trailer.
- **Single-lens review agents** — [`.claude/agents/`](.claude/agents/): contract,
  conversion-instrumentation, accessibility, architecture, QA, spec-authoring, and
  test-writing reviewers.

The git log is the demo: spec → approval → implementation → green checks → merge.

---

## Quality & verification

Verification is deterministic and runs in CI on every PR.

- **151 unit tests** across the workspaces (domain 50 · ui 43 · api 19 · web 29 · analytics 6
  · shared 4) — they assert behaviour and invariants, not just render. Highlights: the
  pricing/portion maths, the calendar's month/year/leap/DST edges, `jest-axe` on the picker,
  and schema-sync drift guards that read `schema.graphql` directly and fail CI if an enum
  diverges from its app-side mirror.
- **A 22-case Cypress catalog** across 5 specs: a CATS→CHECKOUT happy path (with the
  `4242` test card) that asserts the typed funnel events fired end-to-end and the
  variant payload threaded through, plus a delivery-picker correctness / UX / `cypress-axe`
  real-browser catalog. Deterministic via three dev-only hooks (clock + SSR-`today` cookie +
  pinned A/B bucket).
- **CI gates** ([`.github/workflows/`](.github/workflows/)): type-check, lint, format,
  codegen-sync, the full per-workspace unit matrix, a production build, the Cypress suite, a
  **spec-trailer gate** (a PR commit's `Spec: NNN` must resolve to an `approved: yes` spec),
  and a Lighthouse mobile budget.
- **Lighthouse** (mobile, median of 3, documented in
  [`docs/lighthouse.md`](docs/lighthouse.md)): landing **93 / 95 / 100 / 92**, `/wizard/cats`
  **90 / 95 / 100 / 92** (perf / a11y / best-practices / SEO); accessibility and
  best-practices are hard error budgets in CI.

### Honest limitations

A submission for a "wrong is un-mergeable" thesis should name its own gaps:

- Component-level render tests live in `packages/ui`; the `apps/web` step forms are covered
  end-to-end by Cypress rather than by per-component RTL tests.
- The Cypress happy path pins **variant A**; variant B is unit-tested but not driven e2e.
- The RECIPES step's CMS fetch blocks server-side (no streaming `loading.tsx` shell yet).

---

## Run it locally

```bash
nvm use                # Node 24 — see .nvmrc; yarn refuses on Node 18
yarn install
cp .env.example .env    # then fill the values — see the env table below
yarn workspace @sorrel/frontend dev   # the funnel at http://localhost:3000/wizard/cats
yarn workspace @sorrel/api dev        # GraphQL mock at http://localhost:4000

yarn type-check        # strict TS across the workspaces (0 errors required)
yarn test              # the full unit matrix (alias for yarn workspaces run test)
yarn codegen:check     # fail the build if schema.graphql is invalid or codegen drifts
yarn format:check      # formatting
```

Storybook for the picker and the App\* layer: `yarn workspace @sorrel/ui storybook`
(or the deploy at **[sorrel-ui.akinoztorun.dev](https://sorrel-ui.akinoztorun.dev/)**).

### Environment variables

`.env.example` is the canonical template; copy it to `.env` and fill the values. Build-time
keys must also be set in the **Vercel Production + Preview** environment because Next.js
inlines `NEXT_PUBLIC_*` at the moment `yarn build` runs. Runtime keys only need to live in
the Vercel dashboard.

| Class       | Key                                                        | Used by                                                           |
| ----------- | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| Build-time  | `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST`     | Client PostHog SDK (ingestion).                                   |
| Build-time  | `NEXT_PUBLIC_MIXPANEL_TOKEN` / `NEXT_PUBLIC_MIXPANEL_HOST` | Optional second sink.                                             |
| Build-time  | `NEXT_PUBLIC_SITE_URL`                                     | RSC absolute URL fallback. **Production scope only** — see below. |
| Build-time  | `NEXT_PUBLIC_STORYBLOK_PUBLIC_TOKEN`                       | Storyblok Visual Editor bridge.                                   |
| Build-time  | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`                       | The only client-side Stripe surface.                              |
| Server-only | `POSTHOG_PERSONAL_API_KEY` / `POSTHOG_PROJECT_ID`          | `/insights` live funnel read.                                     |
| Server-only | `POSTHOG_HOST`                                             | Server-side Query API host.                                       |
| Server-only | `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`              | `/api/checkout/{intent,webhook}`.                                 |
| Server-only | `STORYBLOK_*` (preview / webhook / PAT / region)           | CMS draft + revalidate paths.                                     |

**Vercel `NEXT_PUBLIC_SITE_URL` scoping.** Set it in the **Production** environment only;
leave it blank on Preview. The Apollo RSC client falls through to `VERCEL_URL` when it is
absent, so preview RSC calls hit the preview deploy's own `/api/graphql` rather than
production's.

### Cypress e2e — required GitHub secrets (spec 044)

The Cypress workflow (`.github/workflows/cypress.yml`) reds on its first PR if these three
repository secrets are absent. The other CI jobs (typecheck, lint, format, unit matrix,
codegen-check, Lighthouse) don't need them.

- **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`** — Stripe test-mode publishable key (`pk_test_…`).
  Baked into the Next.js client bundle at build time.
- **`STRIPE_SECRET_KEY`** — Stripe test-mode key. README recommends a Restricted API Key
  (`rk_test_…`).
- **`STRIPE_WEBHOOK_SECRET`** — Stripe webhook signing secret (`whsec_…`).

Set them once in GitHub → Settings → Secrets and variables → Actions.

### Pre-delivery smoke checklist (spec 044)

Before any demo or delivery, walk
[`docs/pre-delivery-smoke.md`](docs/pre-delivery-smoke.md). It's a 19-item manual run-list
covering the funnel (CATS through CHECKOUT with the 4242 card), the calendar's three close
affordances, locale switch en/de, back-navigation, `/insights`, the Storyblok draft preview

- revalidate webhook, console cleanliness, and the Lighthouse re-run.

### Stripe test mode

The CHECKOUT step uses Stripe's PaymentElement against **test mode only**. The route handlers
pin `apiVersion` and use `automatic_payment_methods`. The client posts only `{ draftId }`; the
server re-derives the price via the GraphQL contract and creates the PaymentIntent.

- **`STRIPE_SECRET_KEY=rk_test_…`** — server-only; a **Restricted API Key** (PaymentIntent +
  Webhook scopes) is recommended over a full secret key. **Never** prefix with
  `NEXT_PUBLIC_`.
- **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…`** — the only client-side Stripe surface.
- **`STRIPE_WEBHOOK_SECRET=whsec_…`** — HMAC-verifies the webhook. In dev, mint one with
  `stripe listen --forward-to localhost:3000/api/checkout/webhook`.

No Stripe account? `npm i -g @stripe/cli && stripe sandbox create` mints a test keyset.
**Test cards:** `4242 4242 4242 4242` (succeeds), `4000 0000 0000 9995` (declines); any
future expiry, any CVC, any postal.

### Dev-only test hooks

Three `NODE_ENV !== "production"` hooks the Cypress suite uses to make the dev app
deterministic — all no-ops in production builds:

- **`sorrel_e2e_today` cookie** — server-side override of the picker's SSR `today`, read in
  `apps/web/app/[locale]/wizard/[step]/page.tsx`, so earliest-deliverable arithmetic is
  reproducible.
- **`window.__sorrelVariant`** — pins the PROFILE A/B bucket to `"A"` or `"B"`, read in
  `useVariant.ts`.
- **`window.__sorrelAnalyticsQueue`** — a read-only window mirror of the in-memory sink, so
  Cypress can assert the typed funnel events fired end-to-end.

---

## Roadmap

Tiers ship in order; nothing ships below the Tier-1 line. **All three tiers are shipped.**

- **Tier 1 — credible core ✅** the 8-step wizard with typed reducer state, RSC shells with
  client islands, the App\* MUI layer, Apollo queries + optimistic mutations, instrumentation
  firing, mobile-first, deployed, with a mobile Lighthouse budget in CI.
- **Tier 2 — coverage ✅** Storyblok-driven landing/recipes, i18n (en/de) with hreflang, the
  full CI gate matrix (incl. spec-trailer + Lighthouse gates), the Cypress happy path,
  JSON-LD, sitemap/robots, and pre-delivery security/release/dependency hardening.
- **Tier 3 — closers ✅** the `/insights` funnel page (live PostHog + seed fallback);
  **Storybook** on the centerpiece + App\* layer (live at
  [sorrel-ui.akinoztorun.dev](https://sorrel-ui.akinoztorun.dev/)); the **Stripe** test-mode
  CHECKOUT step; and real-browser `cypress-axe` rules on the calendar dialog.

The build is governed by ~40 approved specs under [`specs/`](specs/); the spec sequence has
three intentional numbering gaps (021 rejected; 026/027 retired during the calendar-batch
reorganisation that shipped 024/025/028/029).
