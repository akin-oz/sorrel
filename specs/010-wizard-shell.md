---
spec: 010
title: Wizard shell — URL-segmented funnel frame, typed state, instrumentation, resume
approved: yes
tier: 1
owner: apps/web
---

# Problem / gap

`apps/web` is still the create-next-app starter — no funnel exists. The two contracts are now
in place (GraphQL schema 007 + analytics events 009), the centerpiece picker is built
(`packages/ui`, spec 001), and the server stubs answer (spec 008). What is missing is the
**frame** that turns them into a measurable funnel: URL-segmented steps, a typed state
machine, the conversion instrumentation, and abandonment-safe resume.

Per direction this is the **shell only** — the frame plus coherent placeholder screens for
all seven steps, with DELIVERY wiring the real picker. The per-step forms (real inputs,
validation, `field_error`) are follow-up specs so each turn ships something unbroken.

# Scope

## Routing — `/wizard/[step]`, deep-linkable

- `apps/web/app/wizard/[step]/page.tsx` — dynamic segment. Validates `params.step` against
  `FUNNEL_STEPS` (`@sorrel/shared`); an unknown step calls `notFound()`. Each step is a
  deep-linkable, independently measurable analytics unit (the funnel-reviewer's premise).
- `apps/web/app/wizard/layout.tsx` — the persistent frame: `BrandLogo` header (from
  `@sorrel/ui`), a progress indicator derived from the step's index in `FUNNEL_STEPS`, and
  Back / Next navigation.
- `apps/web/app/wizard/page.tsx` — redirects `/wizard` → `/wizard/cats` (first step).
- Replace the starter `app/page.tsx` with a minimal landing that links into `/wizard/cats`
  (removes the Next.js boilerplate — no more `next.svg` / "edit page.tsx").

## Component library + theming (MUI)

The architecture names MUI as the `apps/web` UI layer, and the upcoming per-step forms
(inputs, selects, validation/error states) are where it earns its keep — so the shell adopts
it now to front-load the App Router setup and the stack signal.

- **Deps** (flagged below): `@mui/material` + `@emotion/react` + `@emotion/styled`, plus
  `@mui/material-nextjs` for the App Router emotion cache.
- **Root wiring** — `apps/web/app/layout.tsx` wraps `<body>` in `AppRouterCacheProvider`
  (SSR-safe emotion) + `ThemeProvider` + `CssBaseline`.
- **One token source** — `apps/web/app/theme.ts` builds the MUI theme **from the Sorrel
  tokens already in `@sorrel/ui`** (`sorrelTheme`): primary = accent terracotta, paper
  background, shared radii. The bespoke `DeliveryDatePicker` and the MUI chrome read the same
  palette — the picker stays bespoke (it is the centerpiece), but the funnel does not look
  like two products.
- The chrome (header, progress, nav), the landing page, the step shells, and the exit-intent
  modal are built from `@mui/material` (`Box`/`Stack`, `LinearProgress`, `Button`,
  `Typography`, `Dialog`). No `*.module.css` for the shell.

## Typed state machine (pure, testable)

- `apps/web/app/wizard/state.ts`:
  - `FunnelState` — the client draft shape: `cats`, `recipeSlugs`, `deliveryDate`,
    `frequency`, `email`, `furthestStep`. Field names mirror `FunnelDraft` (schema) minus the
    server-only fields (`id`, `updatedAt`).
  - `funnelReducer(state, action): FunnelState` — a **pure** reducer (`SET_DELIVERY_DATE`,
    `SET_FREQUENCY`, `ADVANCE`, `RESET`, `HYDRATE`). Pure so it unit-tests with no DOM.
  - `nextStep(step)` / `prevStep(step)` — navigation derived from `FUNNEL_STEPS` order;
    clamp at ends.
- `apps/web/app/wizard/FunnelProvider.tsx` — React context wrapping `useReducer`, plus the
  persistence effect (below). Client component.

## Abandonment-safe resume (local)

- On every state change, persist `FunnelState` to `localStorage` under a versioned key
  (`sorrel.funnel.v1`). On mount, `HYDRATE` from it. Resume mid-funnel survives a reload or
  an accidental tab close — no backend needed.
- **Server draft sync** (`saveFunnelDraft` mutation, cross-device resume) is **out of scope**
  here — it needs the Apollo Client + `apps/web` operation-type codegen, which is its own
  follow-up spec (the Apollo write-path). Local resume is complete on its own; server sync is
  an enhancement layered on top, not a prerequisite.

## Conversion instrumentation (the point of the shell)

- `apps/web/app/wizard/analytics.ts` — constructs the app tracker from `@sorrel/analytics`
  `createTracker`. Sink selection is env-driven and deterministic by default:
  - **Default (no key): `memorySink`** — the demo and tests run fully offline and
    reproducible (the verification ethos). No network, no SDK calls.
  - **Keyed (`NEXT_PUBLIC_POSTHOG_KEY` present): `posthogSink`** — a thin adapter wrapping
    `posthog-js` whose only job is `sink.emit(event) → posthog.capture(event.name, props)`.
    The SDK never leaks past this one file; the rest of the app speaks only `FunnelEvent`.
    PostHog is the chosen vendor because it covers both halves of the thesis: native funnel
    visualization (the 39→65 drop-off) **and** feature flags/experiments for the `variant`
    A/B path. The `variant` prop stays vendor-agnostic — sourcing it from PostHog flags today
    does not preclude swapping the flag provider later, since the events don't depend on it.
- Fire, with correct typed props:
  - `funnel_step_viewed` on each step mount (prop: `step`, `variant` when an A/B flag is
    present).
  - `step_completed` on a successful Next (prop: `step`).
  - `funnel_abandoned` on route-leave / unmount without completion (prop: `step` = furthest
    reached).
- `field_error` is **defined but not yet fired** — placeholder steps have no real inputs.
  It begins firing when the first real step form lands (follow-up spec). Called out so the
  funnel-reviewer's coverage map reads "intentionally deferred," not "missing."

## Exit-intent recovery modal (a proven conversion win)

An exit-intent recovery surface — intercept the abandonment gesture, offer a reason to stay,
measure whether it worked. This is the funnel thesis in miniature: a fix you can A/B and lock.

- `apps/web/app/wizard/useExitIntent.ts` — the trigger hook. **Desktop:** document
  `mouseleave` with `clientY <= 0` (cursor leaving toward the browser chrome). Fires **at
  most once per session** (a `sessionStorage` flag — no nagging), armed on every step
  **except SUMMARY** (a near-complete user needs no recovery prompt). **Honest scope:**
  classic exit-intent is a desktop-class signal; touch devices have no `mouseleave`, so the
  modal does not pretend to fire there — mobile abandonment stays covered by the existing
  `funnel_abandoned` on `pagehide`. No fabricated mobile exit signal.
- `apps/web/app/wizard/ExitIntentModal.tsx` — a MUI `Dialog`, which provides the focus trap,
  `Escape`/backdrop close, and `prefers-reduced-motion`-aware transitions out of the box (no
  hand-rolled trap). `DialogTitle` / `DialogContent` / `DialogActions` with a primary "Keep
  going" and a secondary "Leave for now". States stay explicit — open, transitioning out, and
  unmounted — and it will not re-arm once shown this session.
- **Copy** is brand-safe and invents nothing (no discounts, no competitor references): a
  heading ("Leaving so soon?"), one reassurance line keyed to the local-resume already built
  ("We've saved your progress — pick up right where you left off."), a primary "Keep going"
  and a secondary "Leave for now".
- **Instrumentation:** `exit_intent_shown` (step) on open; `exit_intent_recovered` (step)
  when the user takes "Keep going". Leaving anyway emits the existing `funnel_abandoned`.
  Recovery rate = `exit_intent_recovered ÷ exit_intent_shown` — the win, made measurable.
- Both events come from the spec 009 contract (`@sorrel/analytics`) — no ad-hoc event is
  introduced in `apps/web`. A future shared `Modal` primitive in `packages/ui` (extracting
  the focus-trap/animation shared with the picker) is a possible refactor, **out of scope**
  here.

## Steps — coherent placeholders, DELIVERY real

- Seven step components under `apps/web/app/wizard/steps/`. Each renders a titled, coherent
  screen (heading + one-line description + working Back/Next) — not a TODO stub.
- **DELIVERY** mounts the real `DeliveryDatePicker` (`@sorrel/ui`) under the Sorrel theme,
  writing the chosen date through `SET_DELIVERY_DATE`. This is the proof the shell composes
  the centerpiece, not a mock.

## Tests

- `apps/web/app/wizard/state.test.ts` — pure reducer tests: `ADVANCE` moves the step and
  raises `furthestStep`; `SET_DELIVERY_DATE` records the date; `HYDRATE` round-trips; reducer
  never mutates input. No new deps (reducer is pure).
- Full DOM/interaction tests (`@testing-library/react` + `jsdom`) are **flagged** as a
  follow-up — they add devDeps and belong with the first real form. The pure reducer + the
  schema-synced step list give this shell its safety net without them.

# Contract impact

None. Consumes the GraphQL schema (via the picker/domain, not yet via a live client) and the
analytics contract; changes neither. No `schema.graphql` or `packages/domain` edits.

# Out of scope

- Apollo Client, `apps/web` operation-type codegen, `saveFunnelDraft` server sync — its own
  follow-up spec (the Apollo write-path).
- Real per-step form fields, validation, and `field_error` emission — per-step specs.
- The seed script / drop-off curve generator — its own spec.
- The MUI icon set (`@mui/icons-material`) and data-heavy MUI components (DataGrid, etc.) —
  the shell uses core `@mui/material` only; the brand mark stays `BrandLogo` from `@sorrel/ui`.
- Re-skinning the `DeliveryDatePicker` in MUI — it stays bespoke (the centerpiece); only its
  palette is shared via the token-derived theme.
- The A/B autocomplete-postcode flag itself — the `variant` prop is plumbed through the
  events, but the flag's source/bucketing is a follow-up.

# New dependencies (flagged for approval)

| Package                              | Type             | Reason                                                                                           |
| ------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------ |
| `@sorrel/ui`                         | dep (`apps/web`) | the `DeliveryDatePicker` + `BrandLogo`                                                           |
| `@sorrel/analytics`                  | dep (`apps/web`) | the typed tracker                                                                                |
| `@sorrel/shared`                     | dep (`apps/web`) | `FUNNEL_STEPS` / `FunnelStep`                                                                    |
| `posthog-js`                         | dep (`apps/web`) | analytics sink — wrapped behind `posthogSink`, only loaded when `NEXT_PUBLIC_POSTHOG_KEY` is set |
| `@mui/material`                      | dep (`apps/web`) | the component library named in the architecture                                                  |
| `@emotion/react` · `@emotion/styled` | dep (`apps/web`) | MUI's styling engine (its peer deps)                                                             |
| `@mui/material-nextjs`               | dep (`apps/web`) | App Router emotion cache for SSR                                                                 |

Three internal workspaces plus the external packages above: `posthog-js` (confined to the
`posthogSink` adapter, unloaded on the default path) and the MUI + emotion stack (the named
UI layer). No SDK calls in the default (unkeyed) analytics path.

# Acceptance criteria

- [ ] `/wizard/cats` … `/wizard/summary` all render; an unknown step 404s
- [ ] Progress + Back/Next derive from `FUNNEL_STEPS` order
- [ ] State persists to `localStorage` and rehydrates on reload (resume works)
- [ ] `funnel_step_viewed`, `step_completed`, `funnel_abandoned` fire with correct typed
      props through the `@sorrel/analytics` tracker (no ad-hoc `track("string")`)
- [ ] DELIVERY mounts the real `DeliveryDatePicker`; chosen date lands in funnel state
- [ ] Sink is env-selected: `memorySink` by default (zero SDK calls / network in tests and
      the unkeyed demo), `posthogSink` only when `NEXT_PUBLIC_POSTHOG_KEY` is set
- [ ] Exit-intent modal (MUI `Dialog`) fires once/session on desktop `mouseleave`, armed on
      all steps but SUMMARY; emits `exit_intent_shown` on open and `exit_intent_recovered` on
      "Keep going"; focus-trap + `prefers-reduced-motion` handled by `Dialog`; no mobile faking
- [ ] `posthog-js` is referenced only inside `posthogSink`; the rest of the app imports only
      `FunnelEvent` / `createTracker`
- [ ] MUI theme is derived from `@sorrel/ui` `sorrelTheme` tokens — one palette across the
      bespoke picker and the MUI chrome
- [ ] Starter boilerplate removed from `app/page.tsx`
- [ ] Pure reducer unit tests pass; `yarn type-check` green (0/0); `next build` succeeds
      (RSC + emotion SSR); existing 35 tests stay green
- [ ] MUI/emotion are the only new external deps beyond `posthog-js`; no real-brand
      names/logos/copy/assets

# Analytics

Fires `funnel_step_viewed` (step, variant?), `step_completed` (step), `funnel_abandoned`
(step), `exit_intent_shown` (step), `exit_intent_recovered` (step). Defines but defers
`field_error` until real inputs exist. All emission goes through the typed `createTracker`
from spec 009 — the funnel-reviewer should find zero untyped events and a coverage map of
5 firing + 1 intentionally deferred.
