# Seed tasks — `principal-review`

The lead converts these into the shared task list (one task per item, assigned to the
named teammate). Each is self-contained and names a concrete deliverable: **findings as
`file:line — what — severity (P0/P1/P2) — fix`**, plus the "verified" evidence for
anything checked and found sound. All tasks are **read-only**.

---

## Architect — `review-principal-architect`

- **A1 · Schema-contract integrity.** Cross-reference every GraphQL operation used in
  `apps/web` and `services/api` against `schema.graphql` (Query/Mutation ~L185+:
  `saveFunnelDraft`, `updateFunnelPlan`, `funnelDraft`; inputs `SaveFunnelDraftInput`,
  `PlanInput`). Confirm operation types are **codegen'd** (`codegen.ts`), not hand-written.
  _Deliverable:_ list of any invented field/op/arg or hand-rolled network type, with the
  schema reality; else the ops you verified resolve.

- **A2 · Domain source-of-truth.** Prove no pricing/portion/plan math lives outside
  `packages/domain/src/pricing/plan.ts` (`MEALS_PER_BOX`, `GRAMS_PER_KG_PER_DAY`,
  `PRICE_MINOR_PER_GRAM`, `FIRST_BOX_DISCOUNT`, `computePlan`). Grep **both** framework
  layers — `services/api/src/**` (it drifted here once) and `apps/web/**` (esp.
  `wizard/draft-input.ts`, `order-summary.ts`) — for `amountMinor` arithmetic, meals-per-box,
  or a re-derived price. _Deliverable:_ any duplication + where it should import from; else
  the boundary-map of who imports `@sorrel/domain`.

- **A3 · App\* layering + cross-brand reuse (spec 018).** Verify `apps/web` is **zero `sx` /
  zero direct `@mui/*`** and the ESLint bans (`no-restricted-syntax` sx, `no-restricted-imports`
  @mui) exist and run in CI. Confirm `DeliveryDatePicker.tsx` stays MUI-free. Then judge the
  layer against the project's **two-theme design-system discipline (theming, design-system
  reuse, drift prevention)**: is the App\* layer a genuine reusable component library with a
  disciplined public API (one logic shell, two token skins — `theme/tokens.ts`), or do brand
  specifics leak into call sites? Note migration state (phases 3–5 may be open) and whether any
  incompleteness left the tree broken vs merely unfinished. _Deliverable:_ residual `sx`/`@mui`
  call sites with file:line, lint-config evidence, and any cross-theme leak / public-API hole
  that invites drift.

- **A4 · Governance soundness + AI-workflow demo-readiness.** Read `.claude/hooks/`
  (`guard-commit.sh`, `guard-source-of-truth.sh`, `guard-domain-logic.sh`, `verify-on-stop.sh`)
  and the rules. Answer concretely: can a change with no approved spec, a missing `Spec:`
  trailer, or domain math snuck into an unwatched file actually merge? Then judge the
  **AI-workflow story on its own merits**: is the spec-gated governance coherent and
  _demo-ready_ — specs ↔ commits ↔ hooks ↔ CI mirror (`spec-gate.yml`) telling one legible
  narrative a senior reviewer would trust — or is it theatre with gaps? _Deliverable:_ each
  enforcement gap as a P0/P1 with the exact bypass; plus a one-line verdict on whether the
  governance story demos cleanly, with the lines that prove it.

- **A5 · Cross-layer enum mapping.** Confirm the domain owns its own string-union enums and
  each framework layer maps codegen/domain enums at its boundary (never the reverse). Spot a
  place where a GraphQL enum value is hardcoded in `apps/web` instead of mapped.
  _Deliverable:_ any reversed dependency direction; else the mapping points verified.

---

## Staff FE — `review-staff-frontend`

- **F1 · RSC↔client frontier.** Map every `"use client"` in `apps/web` and confirm the
  `wizard/[step]/page.tsx` server branch (awaits `params`/`draftMode()`/`getRecipes()`) stays
  server and passes only serialisable props to `StepScreen`. Flag any `window`/PostHog/
  `createAppTracker()` reachable during SSR outside the `FunnelProvider` lazy-`trackerRef`
  guard. _Deliverable:_ boundary violations file:line; else the frontier you traced.

- **F2 · Hook + effect correctness.** Audit `useVariant.ts`, `useExitIntent.ts`,
  `useDraftAutosave.ts`, `FunnelProvider.tsx`: dependency arrays honest, every
  listener/timer/subscription torn down, the `funnel_step_viewed` re-fire guard (~L65) intact.
  _Deliverable:_ each effect → deps + cleanup verdict, with any leak/stale-closure as P0/P1.

- **F3 · Server action + optimistic UI.** Review `EmailForm.tsx` (`useActionState` +
  `email-action.ts`): pending wired to the button, errors surfaced, no stale action closure.
  Review `PlanForm.tsx` optimistic price preview: optimistic value reconciles on settle and
  **rolls back** on a failed `updateFunnelPlan` (no stranded fake price). _Deliverable:_
  failure-path findings file:line.

- **F4 · Suspense / streaming / paint-layout-CLS.** Check for `loading.tsx`/`<Suspense>`
  around the async server work in the wizard + recipe routes, `AppSkeleton` where data
  streams. Then judge **paint/layout cost to the project's performance standard** —
  beyond a Lighthouse number: reserved space for late content (no CLS from images/fonts/
  rail-summary), the emotion runtime's hydration cost on the wizard's critical path, layout
  thrash from optimistic price swaps, and font-swap shift (`next/font` display strategy).
  _Deliverable:_ each layout-shift / paint-cost source file:line with the fix, or confirmation
  the streaming + reflow story is intentional and shift-free.

- **F5 · Hydration safety.** Hunt server/client divergence: `Date.now()`/`Math.random()`/
  `window`/locale formatting in render. Confirm the `useVariant` null-then-settle pattern is
  used wherever a value is non-deterministic. _Deliverable:_ each hydration risk file:line +
  the deterministic fix.

- **F6 · App\* component API (`packages/ui/src/app/`).** Review `primitives.tsx` +
  `components.tsx`: props are intent-not-CSS (spec 018), `Omit<…,"sx">` actually closes the
  styling hole, `forwardRef`/`displayName` where MUI needs them, `"use client"` correct on the
  wrappers, no prop that re-opens raw styling. _Deliverable:_ API-design findings file:line.

---

## Designer — `review-senior-designer`

- **D1 · Token fidelity sweep + cross-theme drift.** Grep `apps/web` for hardcoded
  hex/px-radius/off-scale gaps that should come from `packages/ui/src/theme/tokens.ts`
  (palette/type) or `src/app/tokens.ts` (`radius.surface 16`/`shell 24`, `cardMaxWidth 420`/
  `pageMaxWidth 1120`, `control.minHeight 44`/`52`). Because this is a **two-theme**
  codebase (Sorrel + the second skin — the project's two-theme design-system discipline +
  drift-prevention standard), also verify **no value is defined twice across the two skins**
  and that a call site reads from the token layer, never re-types a skin-specific literal.
  _Deliverable:_ each literal file:line → the token it should resolve to; plus any value that
  drifts between skins.

- **D2 · Wizard shell vs handoff — EXACT match (spec 019).** Pixel fidelity is a core
  project standard, so judge against an _exact_ design match, not "close enough": mobile =
  one 420 card, desktop = 1120 two-pane `420px 1fr` with flush panes
  divided by the rail border (no gutter), square inner panes so only the wrapper rounds, step
  heading in the rail (desktop) / form (mobile), and `Save & exit` as a muted secondary link
  not a terracotta button. For every measurable property (gap, padding, radius, line-height)
  give the handoff value and the built value to the pixel, and flag any drift between the two
  brand skins on this shell. _Deliverable:_ each parity gap with handoff-value vs built-value,
  measured not eyeballed; state where you measured vs. inferred.

- **D3 · The 7 steps, state-by-state.** For CATS (`CatsForm`), PROFILE (`ProfileForm` pills/
  autocomplete, spec 022), RECIPES (`RecipesPicker`), DELIVERY, PLAN (`PlanForm`), EMAIL,
  SUMMARY: control heights, card radii, selected/hover/focus/disabled states, and the
  serif/sans/mono type roles. _Deliverable:_ per-step fidelity notes with file:line.

- **D4 · Delivery calendar craft (`DeliveryDatePicker.tsx`).** Judge the _visual_ craft only:
  Monday-first grid cell sizing, blocked-day muting, the free-delivery pill, the scrim,
  `radiusControl`/`radiusCta`/`radiusPill`, and the two-skin token swap holding (logic shell
  unchanged between skins). _Deliverable:_ visual findings; a11y mechanics → hand off.

- **D5 · Landing + `/insights`, bilingual.** Review `app/_cms/*` (Hero, FeatureGrid,
  HowItWorks, RecipeCard, FaqSection, TestimonialSection, SiteNav/Footer) and
  `insights/page.tsx` (`AppMeter` bars) for band rhythm, max-widths, the EN/DE
  `LocaleSwitcher`, and German-length wrapping/truncation in **both** locales.
  _Deliverable:_ responsive/locale findings file:line.

- **D6 · Hierarchy & brand coherence.** Across all surfaces: primary CTA dominant (accent,
  pill) vs recessive secondaries, consistent elevation/border, warm Sorrel palette coherent
  surface-to-surface, no real-brand assets. _Deliverable:_ hierarchy/consistency findings, or
  a coherence verdict with evidence.

---

## Conversion analyst — `review-conversion-analyst`

- **C1 · Step→event coverage matrix.** From the emit sites (`FunnelProvider.tsx` view/abandon,
  `WizardChrome.tsx` step*completed/exit-intent, `ProfileForm.tsx` + `EmailForm.tsx`
  field_error) build the CATS→SUMMARY matrix: which of the six events fires on each step with
  which props. \_Deliverable:* the filled matrix + every gap as P0 (unmeasured step/path).

- **C2 · Prop completeness & no-dupes.** Verify `variant` rides every event where the split
  matters (PROFILE `funnel_step_viewed` **and** `step_completed`, ideally through SUMMARY),
  `field_error.error` is a machine code not display copy, and the `analytics.ts` fan-out
  duplicates **destinations** not **events** (no double-emit; the same-step view-refire guard
  is correct, not a dropped view). _Deliverable:_ prop/dup findings file:line.

- **C3 · A/B validity (`useVariant.ts`, specs 014/022).** Check: one stable bucket per
  session; the `null`→variant settle doesn't let PROFILE's view/complete fire with
  `variant: undefined`; control = real toggle pills (spec 022 de-strawmanned it) vs test =
  autocomplete; 50/50 with no SRM; offline `Math.random` bucket cleanly separated from the
  PostHog-managed split. _Deliverable:_ a VALID/INVALID verdict with the specific threat.

- **C4 · Recoverable abandonment.** Confirm `funnel_abandoned` fires on the real exit
  (`useExitIntent.ts` pagehide / `FunnelProvider`), local resume works (`ResumeBanner.tsx`,
  `STORAGE_KEY`) and `saveFunnelDraft` autosave (`useDraftAutosave.ts`) persists, and
  `exit_intent_recovered ÷ exit_intent_shown` is computable. Judge whether spec 022's
  exit-intent assessment offer is instrumented or just copy. _Deliverable:_ recovery-coverage
  findings.

- **C5 · `/insights` honesty (specs 014/023).** Compare `insights/page.tsx` +
  `lib/insights-data.json` (and the spec-023 live-PostHog read) against the events the app
  actually fires: same 7 steps, same `variant` breakdown, honest live-vs-fallback labelling,
  `seed` boolean separating real from seeded. _Deliverable:_ any place synthetic data is shown
  as live, or a confirmation the surface is honest.

- **C6 · Thesis-claim audit → the 39→65 conversion thesis.** For each README "Decisions" claim
  (URL-segmented attribution, autocomplete-vs-pills, draft+`saveFunnelDraft` resume, exit-intent
  recovery) confirm a concrete event/prop exists to measure it. Then map each lever **back to
  the project's 39→65 signup-conversion thesis**: for every claimed conversion win, can a
  growth engineer actually read the lift from this instrumentation, attributed by step and by
  variant? _Deliverable:_ each claim → the event that backs it (and how it rolls up to the
  funnel number), or P1 "unverifiable — no instrument".

---

## QA engineer — `review-qa-engineer`

- **Q1 · Suite inventory & assertion quality.** Enumerate every `*.test.ts(x)`
  (`find . -name "*.test.ts*" -not -path "*/node_modules/*"` → the 9 specs across
  `packages/{domain,shared,analytics}`, `services/api`, `apps/web`) and read each end-to-end.
  Judge **behaviour vs. no-throw**: does each test assert an output/state, or just call a
  function and expect no error? Credit the strong ones precisely (e.g. `plan.test.ts:77`
  determinism, `events.test.ts:10` compile-time exhaustiveness, the `funnel.test.ts` /
  `dietary.test.ts` schema-sync firewalls). _Deliverable:_ per-spec assertion-quality verdict;
  any test that merely executes code flagged P2.

- **Q2 · The missing e2e (Tier-2 gap) — prove it, then spec it.** Prove there is **no**
  Cypress/Playwright e2e: `grep -ri "cypress\|playwright"` (minus node*modules) returns
  nothing, no `cypress/` dir, no e2e job in `.github/workflows/ci.yml`. State plainly that the
  funnel is never verified to complete in a browser — the single highest-value missing test
  for a conversion demo held to the project's quality bar. \_Deliverable:* the minimal
  CATS→SUMMARY happy-path e2e spec (steps, assertions, where it lives, the CI job to add) as a P0.

- **Q3 · The missing component-render tier.** Prove `@testing-library/react` is absent
  (`grep -r "@testing-library" --include=package.json`). The forms (`ProfileForm`,
  `EmailForm`, `PlanForm`, `CatsForm`, `RecipesPicker`), `WizardChrome`, `ResumeBanner`,
  `ExitIntentModal`, the App\* layer (`packages/ui/src/app/*`) and `DeliveryDatePicker` have
  their interactive states (pending button, error surfacing, optimistic rollback, focus trap)
  asserted nowhere. _Deliverable:_ the prioritised list of components that most need a render
  test and the one behaviour each should assert; severity P0/P1 by funnel-criticality.

- **Q4 · Server-action / optimistic / hook coverage.** Identify the untested behavioural
  paths most likely to regress silently: `email-action.ts` + `useActionState` wiring, the
  PLAN optimistic preview + **rollback** on a failed `updateFunnelPlan`, `useDraftAutosave`,
  `useExitIntent`, the `useVariant` null→settle, and the `services/api` `saveDraft` map. Map
  each to the test (unit or component) that would lock it. _Deliverable:_ untested-path list →
  the concrete test to add, with the file:line of the code under test.

- **Q5 · Determinism & flake (vs `.claude/rules/verification.md`).** Read the verification
  covenant + `verify-on-stop.sh`. Audit for date-fragility (`computeDeliveryEstimate` and the
  api estimate test as the real clock marches past seeded assumptions; the domain calendar
  tests correctly pin fixed ISO dates — confirm), `Date.now()`/`Math.random()` reachable in a
  test without seed/clock control, and shared mutable module state between specs (the in-memory
  `saveDraft` store) causing order-dependence. _Deliverable:_ each flake risk file:line + the
  hardening (pin the clock / reset the store / seed the RNG).

- **Q6 · Coverage-bar verdict & A/B-test gap.** Render a per-workspace coverage map
  (unit ✓/gap · component ✓/gap · e2e ✓/gap) and judge it against the project's
  **deterministic-verification standard** (`.claude/rules/verification.md`, which expects
  coverage) — does this suite meet the bar, and where is it materially short? Note
  specifically that **no test asserts the A/B instrumentation** (`variant` riding
  `funnel_step_viewed`/`step_completed`, the same-step view-refire guard) — flag the missing
  test and hand the event _semantics_ to `review-conversion-analyst`. _Deliverable:_ the
  coverage map + a one-line "meets bar / below bar" verdict with the gap that decides it.
