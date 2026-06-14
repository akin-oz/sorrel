---
spec: 038
title: Storybook on the centerpiece and the App* layer
approved: yes
tier: 3
owner: packages/ui
---

# Problem / gap

Storybook has been called out under Tier-3 in `README.md` as "Unstarted, no spec yet"
since the roadmap audits started flagging it, and no approved spec covers it.
Spec 001 ships the `DeliveryDatePicker` centerpiece, spec 006 ships `BrandLogo`,
spec 018 ships the App\* adaptive layer (`AppCard`, `AppText`, `AppHeading`,
`AppButton`, `AppField`, `AppToggleGroup`, `AppToggleOption`, …), and spec 035
adds `cypress-axe` against the running funnel — none of them touch Storybook.

Without it, three concrete gaps stay open:

1. **No design-handoff surface.** `DeliveryDatePickerProps` lives only in TS, the
   brand-skin swap (`sorrelTheme` / `brambleTheme` from `packages/ui/src/theme/tokens.ts`)
   lives only in a runtime `<DeliveryDatePicker theme={...} />` toggle, and the
   App* tokens live only in the running funnel. A reviewer cannot open a URL to
   compare the two brand skins side-by-side or inspect each App* primitive in
   isolation against its tokens.
2. **No component-level structural inspection.** Jest pins behaviour and Cypress
   pins integration; neither catches a prop axis breaking quietly until a story
   that exercises it is opened.
3. **No per-primitive a11y inspection.** `jest-axe` (specs 024 / 035) and
   `cypress-axe` (spec 035) gate the picker dialog and the funnel pages.
   `@storybook/addon-a11y` would close the loop at the smallest unit (App\*
   primitives in isolation), under the same axe config the Cypress catalog uses.

# Scope

The exact files, directories, packages, and decisions this spec touches.

## 1. Storybook engine + addon set

Add to `packages/ui/package.json` under `devDependencies` (exact versions land in
the PR commit, not the spec body):

- `storybook` (8.x or current major)
- `@storybook/react-vite` **OR** `@storybook/nextjs` — see Decision A below
- `@storybook/addon-essentials` (controls / actions / viewport)
- `@storybook/addon-a11y` (axe-core per story)
- `@storybook/addon-themes` (the brand-skin switch toolbar)
- `@storybook/test` (for the optional interactions play-functions on the picker)
- If Decision A picks Vite: `vite`, `@vitejs/plugin-react`
- Optional: `@storybook/addon-interactions` (only needed if play-functions exercise
  the picker's open → navigate → confirm sequence; the initial cut may skip this)

New scripts in `packages/ui/package.json`:

- `"storybook": "storybook dev -p 6006"`
- `"build-storybook": "storybook build"`

**Decision A — Vite vs. Next renderer.** The spec recommends `@storybook/react-vite`
because `packages/ui` is framework-agnostic (the picker and the App* layer have
no Next dependencies — they import only `@mui/material`, `@emotion/*`, and React).
Vite gives a lighter dev loop and faster cold builds. The human picks at approval
time; if they pin `@storybook/nextjs`instead, the same story files apply but the
preview config swaps and`vite`/`@vitejs/plugin-react` drop out of devDeps.

## 2. New `.storybook/` directory under `packages/ui/`

- `packages/ui/.storybook/main.ts` — story glob (`../src/**/*.stories.@(ts|tsx)`),
  the addon list, the framework block (per Decision A).
- `packages/ui/.storybook/preview.tsx` — global decorators:
  - Inject the Source Serif 4 / Public Sans / IBM Plex Mono `--font-*` CSS
    variables that `packages/ui/src/theme/tokens.ts` (`FONT_SERIF`, `FONT_SANS`,
    `FONT_MONO`) reads from, so rendering matches production.
  - Wrap every story in a decorator that resolves the current brand theme (from
    `@storybook/addon-themes` globals) to either `sorrelTheme` or `brambleTheme`
    and emits the `--sdp-accent`, `--sdp-surface`, … CSS variables the picker
    reads (same shape as `useInjectDeliveryStyles`).
  - Configure `@storybook/addon-a11y`'s axe options to match the Cypress catalog's
    `axeConfig` in `apps/web/cypress/e2e/delivery-picker/a11y.cy.ts`: only
    `region` and `page-has-heading-one` are disabled; every other rule
    (`color-contrast`, `landmark-one-main`, focus-trap, ARIA, name-role-value)
    runs.
- `packages/ui/.storybook/manager.ts` — toolbar branding (title, no link-outs to
  external services).

## 3. Story files (co-located with source)

Each story file defines a typed `Meta<typeof Component>` default export with a
`title` and at least one named export. The initial cut:

- `packages/ui/src/DeliveryDatePicker.stories.tsx` — the centerpiece. At least
  six named exports exercising the public prop shape from
  `DeliveryDatePickerProps` (around L83-102 of `DeliveryDatePicker.tsx`):
  - `Default` — Sorrel skin, all defaults.
  - `Bramble` — `theme={brambleTheme}`.
  - `Controlled` — controlled `value` + `onConfirm` action.
  - `CustomToday` — `today="2026-06-20"` to pin the visible month.
  - `ExtendedLead` — `leadDays={5}`.
  - `German` — `locale="de-DE"` with the merged `Partial<DeliveryLabels>` block.
  - Optional: `BlockedReasonExplorer` and `FocusRingCloseUp`.
- `packages/ui/src/BrandLogo.stories.tsx` — `BrandLogo` under both brand skins
  (spec 006's public surface).
- `packages/ui/src/app/AppCard.stories.tsx` — `tone`, `radius`, `shadow`,
  `border`, `borderRight`, `borderTop`, `borderBottom`, `direction`, `divider`,
  `padding` axes.
- `packages/ui/src/app/AppText.stories.tsx` — `variant` (body1/body2/overline/
  caption) × `fontWeight`, `align`, `textWrap` axes.
- `packages/ui/src/app/AppHeading.stories.tsx` — `level` (1/2/3) × `fontSize`,
  `textWrap` axes.
- `packages/ui/src/app/AppButton.stories.tsx` — default + `inverted`, plus the
  MUI pass-through variants (`contained` / `outlined` / `text`).
- `packages/ui/src/app/AppField.stories.tsx` — text input, `select` + `options`,
  `error` + `helperText`.
- `packages/ui/src/app/AppToggleGroup.stories.tsx` — `layout` axis
  (`segmented` / `cards` / `pills`) with `AppToggleOption` children.

Secondary primitives (`AppChip`, `AppSkeleton`, `AppAlert`, `AppLink`,
`AppIconButton`, `AppBand`, `AppImage`, `AppProgressBar`, `AppMeter`,
`AppDialog`) are explicitly out of scope for the initial cut — they ride a
follow-on spec.

## 4. Brand-skin switching

The `@storybook/addon-themes` toolbar exposes a global theme toggle with two
options: `Sorrel` and `Bramble`. The preview decorator resolves it to the
matching `DeliveryTheme` from `packages/ui/src/theme/tokens.ts` and:

- Injects the `--sdp-*` CSS variables the picker reads.
- Wraps App* stories in the corresponding MUI ThemeProvider seed (the same
  `sorrelTheme` values the App* layer reads from `../theme/tokens` and
  `./tokens` — `appTokens`).
- Calls `useInjectDeliveryStyles` once at preview boot.

Switching the toolbar must flip day-cell colours, App\* card surfaces, and the
`BrandLogo` on every story without console errors.

## 5. A11y gate

`@storybook/addon-a11y` runs axe-core per story. Configuration matches the
Cypress catalog's `axeConfig`:

- Disabled rules: `region`, `page-has-heading-one`.
- Every other rule runs, including `color-contrast`.

The mid-animation contrast issue surfaced in spec 036 is handled by giving the
picker stories a `play` function (from `@storybook/test`) that waits for the
modal's `opacity:1` (matches the spec-036 fix) before the addon snapshots the
a11y report. Per-story overrides are documented in `preview.tsx` so a future
author knows the pattern.

## 6. CI gate

New `.github/workflows/storybook.yml` that runs on every PR and on push to `main`:

- Trigger: `on.pull_request` and `on.push.branches: [main]`.
- Node 24 via `.nvmrc` (same as `ci.yml`).
- Yarn cache via `actions/setup-node`.
- Concurrency group keyed on workflow + ref with `cancel-in-progress: true`
  (same shape as `cypress.yml`).
- Step: `yarn install --frozen-lockfile` → `yarn workspace @sorrel/ui build-storybook`.
- The gate is **required**, not advisory.
- No Chromatic / Percy / Loki step. No deploy step. The artefact is
  `packages/ui/storybook-static/`; the workflow may upload it via
  `actions/upload-artifact` for inspection but does not publish it.

## 7. README pointer

A one-line addition to `README.md` (under the existing Tier-3 / Dev-only test
hooks block, no structural rewrite) naming `yarn workspace @sorrel/ui storybook`
as the entry point and the addon set (`essentials`, `a11y`, `themes`) so a cold
reader knows what they get.

# Contract impact

None of the existing contracts change:

- `packages/ui` public surface is unchanged — stories live next to source but
  do not export anything new. `packages/ui/src/index.ts` is not edited.
- `apps/web`, `services/api`, `packages/domain`, `packages/analytics`: untouched.
- `schema.graphql`: untouched. No generated-type churn.
- `packages/domain`: untouched. No invariants moved or duplicated.

The diff adds new dev-dependencies in `packages/ui/package.json` (listed in
Scope §1 above) and a new `packages/ui/.storybook/` directory (~200 lines total
across `main.ts`, `preview.tsx`, `manager.ts`). Exact pinned versions land in
the PR commit message, not in this spec body.

# Out of scope

Explicit exclusions to lock the scope:

- **Visual regression services** (Chromatic, Percy, Loki). The CI gate is
  "Storybook builds", not "Storybook pixel-matches".
- **Public Storybook deployment** (e.g. a Vercel project at
  `storybook.akinoztorun.dev`). Tracked for a follow-on spec.
- **Stories for every App\* primitive.** The initial cut covers the centerpiece,
  `BrandLogo`, and six primary App\* primitives. Secondary primitives
  (`AppChip`, `AppSkeleton`, `AppAlert`, `AppLink`, `AppIconButton`, `AppBand`,
  `AppImage`, `AppProgressBar`, `AppMeter`, `AppDialog`) ride a follow-on.
- **Stories for the wizard step forms** (`CatsForm`, `ProfileForm`,
  `RecipesPicker`, `PlanForm`, `EmailForm`, `SummaryForm`). They live in
  `apps/web` and would need either a second Storybook instance or a
  `@storybook/nextjs` host with Apollo / next-intl / posthog mocks — out of
  scope here.
- **Mocking Apollo / next-intl / posthog in Storybook.** The centerpiece and
  the App\* primitives do not consume any of these. If a wizard-step story spec
  lands later, mocks can land with it.
- **Replacing `jest-axe` or `cypress-axe`.** Storybook's axe addon is additive;
  the existing axe gates stay in place.
- **Changes to the runtime picker, the App\* tokens, or the spec-024 / 025 /
  028 / 029 / 031 / 034 / 036 contracts.** Stories exercise the existing public
  surface; they do not extend it.

# Acceptance criteria

- [ ] `yarn type-check` — green (0 errors / 0 warnings).
- [ ] `yarn lint` — green (no new `eslint-disable`, `@ts-ignore`,
      `@ts-expect-error`, or `// @ts-nocheck` anywhere in the diff).
- [ ] `yarn format:check` — green.
- [ ] `yarn workspace @sorrel/ui storybook` opens Storybook locally on
      `http://localhost:6006` and renders every committed story without console
      errors.
- [ ] `yarn workspace @sorrel/ui build-storybook` produces
      `packages/ui/storybook-static/` with no warnings (Vite reports
      `built in Xs`, zero `warn` lines; or the Next builder equivalent under
      Decision A).
- [ ] `yarn workspace @sorrel/ui test` — existing suites stay green and one new
      Jest structural-check passes: a test that imports each `.stories.tsx`
      file's `default` export and asserts it has a `title` and a `Default`
      named export, so a deleted-by-accident story file fails fast.
- [ ] The brand-skin toolbar flips between Sorrel and Bramble on every story;
      the picker's day-cell colours, the App\* card surfaces, and `BrandLogo`
      all change without console errors.
- [ ] The a11y panel reports 0 violations on every committed story under the
      Cypress catalog's `axeConfig` (`region` + `page-has-heading-one` skipped
      only; `color-contrast`, `landmark-one-main`, focus-trap, ARIA,
      name-role-value all run). The picker stories use a `play` function that
      waits for the modal's `opacity:1` before the report is snapshotted (per
      spec 036).
- [ ] `.github/workflows/storybook.yml` runs on every PR and on push to `main`;
      the gate is required; the workflow follows `cypress.yml`'s shape (Node 24
      via `.nvmrc`, yarn cache via `actions/setup-node`, concurrency group with
      `cancel-in-progress: true`).
- [ ] `README.md`'s Tier-3 / Dev-only test hooks block names
      `yarn workspace @sorrel/ui storybook` as the entry point and the addon
      set.
- [ ] The commit subject includes the canonical `Spec: 038` trailer.

# Analytics

None. Storybook is a documentation and a11y inspection surface; it does not
load PostHog, does not fire `funnel_step_viewed` / `step_completed` /
`field_error` / `funnel_abandoned`, and does not consume the spec-009 typed
contract from `packages/analytics`.
