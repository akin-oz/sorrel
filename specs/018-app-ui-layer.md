---
spec: 018
title: App UI adaptive layer — App* components in packages/ui, no inline styles in apps/web
status: proposed
approved: yes
tier: 2
owner: packages/ui · apps/web
---

# Problem / gap

`apps/web` styles everything with inline MUI `sx` — **~166 `sx=` usages across 26 files**
(WizardChrome 14, FeatureItem 12, SiteFooter 10, Hero/HowItWorks 9, PlanForm 8, FaqSection 7,
…). Spacing, radii, colours and breakpoints are re-typed at each call site, so the same card
border or band padding is defined a dozen ways and drifts. There is no seam: a design tweak
means hunting every file, and a future rendering change (e.g. trimming the MUI/emotion runtime
the Lighthouse work flagged) would have to touch 166 call sites instead of one layer.

`packages/ui` already owns shared UI — but only the bespoke `DeliveryDatePicker` (MUI-free, two
token themes). There is no shared **MUI** layer, so every app component reaches for raw MUI +
`sx` directly.

# Goal

An **adaptive layer** of `App*` components in `packages/ui` that bake the design tokens in, so
`apps/web` composes them with **typed props — never `sx`**. One place defines a card, a band, a
heading; call sites stay declarative and consistent; and the layer becomes the single seam for
any future styling/runtime change. (This is consistency + maintainability, not a perf change —
it stays MUI under the hood — but it makes a later perf swap a one-layer edit.)

# Scope

## packages/ui — the layer

`packages/ui` gains `@mui/material`, `@emotion/react`, `@emotion/styled` (already in `apps/web`;
the wrapping moves here). The bespoke `DeliveryDatePicker` is **untouched** and stays MUI-free.
New components exported from `@sorrel/ui` (App-prefixed):

**Layout primitives** (constrained, tokenized props — `gap`/`p`/`px`/`py` from the spacing
scale, `direction`/`align`/`justify`/`wrap`; **no `sx` passthrough**):

- `AppStack` — flex container (the overwhelming majority of current `sx` is flex + gap)
- `AppBox` — block with tokenized padding/margin only
- `AppContainer` — centered max-width band inner column (CMS `Band`, page sections)
- `AppGrid` — responsive columns (feature grid, recipe grid, the hero's 2-col split)

**Semantic components** (styling fully encapsulated; props are intent, not CSS):

- `AppButton` (Button), `AppHeading` (serif h1–h3), `AppText` (body/overline/caption)
- `AppCard` (the bordered rounded surface: RecipeCard, PLAN price card, SUMMARY list, FAQ rows)
- `AppChip` (dietary tags), `AppField` (TextField/Select for PROFILE/EMAIL)
- `AppToggleGroup` + `AppToggleOption` (frequency + cat-count selectors)
- `AppDialog` (ExitIntentModal), `AppProgressBar` (wizard steps), `AppSkeleton`
- `AppThemeProvider` — wraps `ThemeProvider` + `CssBaseline` (+ the Next App Router cache
  provider) and the `createTheme` from the Sorrel tokens, so `apps/web` imports **no `@mui`
  directly** even for setup. `app/theme.ts` moves behind it.

App/CMS-specific compositions (Hero, FeatureItem, HowItWorks, SiteFooter, WizardChrome, the step
forms, insights, recipes) **stay in `apps/web`** but are rebuilt from the primitives + semantic
components above — zero `sx`.

## Enforcement (wrong is un-mergeable)

- ESLint in `apps/web`: `no-restricted-syntax` bans the `sx` JSX attribute; `no-restricted-imports`
  bans `@mui/*` (force `@sorrel/ui` `App*`). No new dependency — built-in rules. Runs in the
  existing CI lint gate (spec 015).
- After migration, `@mui/material` / `@emotion/*` are removed from `apps/web`'s **direct** deps
  (provided transitively via `@sorrel/ui`).

## Migration (phased; each phase green + committed)

1. Build the layer in `packages/ui` (+ deps, `AppThemeProvider`, the primitives/semantic set).
2. Migrate the wizard (WizardChrome, steps, all forms) → `App*`, remove `sx`.
3. Migrate the CMS bloks → `App*`, remove `sx`.
4. Migrate insights + recipe pages → `App*`, remove `sx`.
5. Turn on the lint ban; drop `apps/web`'s direct `@mui`/`@emotion` deps.

# Contract impact

None (no schema, no GraphQL). New dependencies in `packages/ui`; net dependency removal in
`apps/web`. Visual output unchanged — verified per phase with a screenshot diff of the landing +
each wizard step (en/de).

# New dependencies (flagged for approval)

| Package                | Type                | Reason                                                                        |
| ---------------------- | ------------------- | ----------------------------------------------------------------------------- |
| `@mui/material`        | dep (`packages/ui`) | the wrapped component set (moves from web)                                    |
| `@emotion/react`       | dep (`packages/ui`) | MUI styling engine                                                            |
| `@emotion/styled`      | dep (`packages/ui`) | MUI styling engine                                                            |
| `@mui/material-nextjs` | dep (`packages/ui`) | `AppThemeProvider`'s App Router cache (or keep this one import in `apps/web`) |

# Out of scope

- The bespoke `DeliveryDatePicker` (stays MUI-free, unchanged).
- Any perf/runtime change (still MUI/emotion); a zero-runtime swap is a later spec the layer
  enables.
- Restyling / visual redesign — output must stay pixel-equivalent.

# Acceptance criteria

- [ ] `packages/ui` exports the `App*` primitives + semantic set + `AppThemeProvider`
- [ ] `apps/web` has **zero `sx=`** and **zero direct `@mui/*` imports**; ESLint fails either
- [ ] The lint ban runs in CI (spec 015 gate); `apps/web` no longer directly depends on `@mui`/`@emotion`
- [ ] `DeliveryDatePicker` unchanged and still MUI-free
- [ ] `yarn type-check` + `yarn lint` + `next build` green; existing tests stay green
- [ ] Landing + every wizard step render pixel-equivalent (en + de) — screenshot-verified per phase
- [ ] No real-brand names/assets

# Analytics

None — presentation layer only.
