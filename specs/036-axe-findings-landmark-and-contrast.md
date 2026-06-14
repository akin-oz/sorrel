---
spec: 036
title: Resolve the two deferred axe findings — wizard `<main>` landmark and selected-cell contrast
status: proposed
approved: no # ONLY a human flips this to yes — implementation is gated on it
tier: 1 # centerpiece protection: contrast lives inside the picker; landmark lives in the wizard chrome that hosts it
owner: apps/web (wizard layout) · packages/ui (theme tokens + picker) · apps/web/cypress (axe-config edits)
---

# Problem / gap

Spec 035 promoted "real-browser axe on the calendar dialog" to done by adding
A-01 / A-02 / A-03 to `apps/web/cypress/e2e/delivery-picker/a11y.cy.ts`. Two
real findings surfaced during that work and were intentionally deferred to a
follow-on spec; the skips carry inline one-line "why" comments in `axeConfig`
(file lines 78–91):

1. **`landmark-one-main`** (axe-core severity: moderate). The wizard pages
   (`/[locale]/wizard/<step>`) render a top bar, an optional context rail, and
   the funnel form pane — but no element on the page carries `<main>` or
   `role="main"`. Axe reports the violation on `html` because the page has no
   primary landmark at all. `jest-axe` (jsdom) cannot meaningfully see this in
   isolation because the picker is mounted as a fragment in its own unit
   tests; only the real-browser run on the full wizard page surfaces it.

2. **`color-contrast`** (axe-core severity: serious). The selected `.sdp-cell`
   paints `theme.onAccent` text on `theme.accent` background (DeliveryDatePicker
   lines 804–810). For Sorrel that is `#FFF8F2` on `#A14D27`, which computes
   to roughly 3.2:1 in axe-core 4.10 — under the WCAG AA 4.5:1 threshold for
   body text. The Confirm button uses the same pair (lines 752–757). Axe also
   flags two MUI-generated Typography classes at the closed-card scope
   (`mui-1hoqov1-MuiTypography-root` and `mui-1fp6cmd-MuiTypography-root`)
   inside the wizard chrome — these correspond to the closed-card's "FREE
   DELIVERY" pill caption (`theme.mono` at 10px) and the small monospace
   "EARLIEST DELIVERY" eyebrow (`theme.mono` at 10–11px). `jest-axe` cannot
   compute contrast at all.

No existing approved spec covers either fix:

- Spec 025 hardened picker a11y but only against the jsdom-side rule set.
- Spec 035 ran real-browser axe but explicitly deferred both findings to a
  follow-on with the inline comments in `axeConfig`.
- Spec 031 introduced the `DeliveryTheme` structural check (useful here if
  Option B below is picked) but did not touch contrast or landmarks.

This spec is that follow-on. After it lands, the two finding-skips must be
**removed** from `axeConfig` and A-01 / A-02 / A-03 must pass on the default
axe ruleset.

# Scope

## 1. Wizard `<main>` landmark — `apps/web/app/[locale]/wizard/WizardChrome.tsx`

`apps/web/app/[locale]/wizard/layout.tsx` is a server component that just
nests providers around `<WizardChrome>` (verified — file is 15 lines, no DOM).
The actual DOM lives in `WizardChrome.tsx`. The funnel form pane is the right
`AppCard` rendered at lines 176–222, which wraps `{children}` (the current
step's form) and the Continue CTA.

Change: pass `component="main"` to that `AppCard`. `AppCard` already supports
`component` via its prop surface (used at line 91 with `component="header"`
for the top bar), so this is a presentational swap with no API change. After
the swap:

- The top-bar `AppCard` keeps `component="header"`.
- The right-pane `AppCard` (lines 176–222) becomes `component="main"`.
- The outer wrapper `AppCard` (line 78), the left context-rail `AppCard`
  (line 162), and `<ExitIntentController />` stay as-is — none of them
  rendered `<main>` before, so there is no duplicate-main risk.

The chrome itself does not currently render `<main>` (verified by reading the
whole file); the picker, the rail, and the exit-intent modal do not either.

## 2. Selected-cell contrast — `packages/ui/src/theme/tokens.ts` + `packages/ui/src/DeliveryDatePicker.tsx`

The failing pair is `theme.accent` × `theme.onAccent` at two sites in
`DeliveryDatePicker.tsx`:

- **Selected day cell**, `DayCell` skin, lines 804–810 (`background: theme.accent`,
  `color: theme.onAccent`).
- **Confirm button**, dialog footer, lines 749–769 (same pair).

Two mutually exclusive fixes. The human picks one at approval time.

### Option A — darken `theme.accent`

Adjust the `accent` hex in `sorrelTheme` (and the parallel value in
`brambleTheme`) until `accent × onAccent` meets WCAG AA 4.5:1. Implementer
verifies the chosen hex against axe-core 4.10 locally before commit.

Affects every consumer of `theme.accent`, of which there are six in the
picker (grepped):

- Selected-cell background + border (lines 806–807)
- Confirm-button background (line 756)
- Two `<Dot>` instances inside the closed-card calendar icon (lines 470–471)
- "Change" text-button colour in the closed card (line 531)
- `--sdp-accent` CSS variable on the root (line 370)

Trade-off: bigger visual delta to the brand terracotta; one token edit only.

### Option B — introduce a new on-accent text token (`accentInk`)

Add a new field to `DeliveryTheme`:

- Name: **`accentInk`** (placeholder — the human can rename at approval).
- Semantics: text colour used **on `accent` backgrounds**, distinct from
  `onAccent` which keeps its current near-white role for surfaces where
  contrast already holds (e.g. small accent dots, the focus ring, the
  "FREE DELIVERY" pill — none of which are body text at the 4.5:1
  threshold).
- Sorrel value: a near-black or deep-ink hex chosen so it meets ≥ 4.5:1
  against the existing `#A14D27`. Implementer picks the exact hex and
  verifies it against axe-core 4.10 before commit.
- Bramble value: the same shape — a near-black chosen so it meets ≥ 4.5:1
  against the existing `#3E6B45`.

Then in `DeliveryDatePicker.tsx` swap **only two** sites from `theme.onAccent`
to `theme.accentInk`:

- Selected-cell text (line 808)
- Confirm-button text (line 757)

The four other `theme.accent` consumers (the two dots, the "Change" link
colour, the `--sdp-accent` variable) are unchanged. `theme.onAccent` keeps
its current value and current uses everywhere else.

Trade-off: smallest possible brand delta; one new token surface; both themes
need the new field.

**Author's recommendation: Option B.** It preserves the Sorrel terracotta the
design handoff specifies and bounds the visual change to two elements that
are already supposed to read as "the picked thing".

## 3. Closed-card MUI Typography contrast

Axe flagged two MUI-generated class names at the closed-card scope
(`mui-1hoqov1-MuiTypography-root`, `mui-1fp6cmd-MuiTypography-root`). The
closed-card sits inside `DeliveryDatePicker.tsx` (lines 432–545) and is
**not** built from MUI Typography — it uses raw `<div>` elements with
inline styles. The flagged classes therefore originate from MUI components
in the wizard chrome that surrounds the closed card on the delivery step,
most likely the small `AppText variant="overline"` and helper-text strings
rendered by `WizardChrome` and `WizardRail`.

Implementer must:

- Open the dev server at `/en/wizard/delivery`, inspect the two flagged
  class names, and report back the source component + the token they
  currently use.
- Adjust the `color={...}` prop on those `AppText` (or equivalent) calls to
  a token that meets 4.5:1 against the rendered background. Candidate
  swaps: `theme.mono` (`#A8967F` on Sorrel) → `theme.inkMuted` (`#6E6055`),
  or `text.secondary` → `text.primary`. The exact choice depends on which
  string is flagged and what background it sits on; both candidates are
  already in the token set.
- If neither existing token holds, the spec authorises adding a new
  `theme.captionInk` field on `DeliveryTheme` following the same shape as
  the Option B addition above (both themes, structural check picks it up).
  Author's preference is to reuse `inkMuted` if it clears AA — no new
  token unless necessary.

This step is in-scope precisely because the finding is reported on the
wizard page where the closed card is rendered, and the spec-035 inline
comment names "wizard-chrome Typography tokens" as the source.

## 4. Remove the axe skips — `apps/web/cypress/e2e/delivery-picker/a11y.cy.ts`

In `axeConfig` (lines 78–91 of the current file), **delete** the two finding
entries:

- `"landmark-one-main": { enabled: false }` (lines 82–84 with its three-line
  comment)
- `"color-contrast": { enabled: false }` (lines 85–89 with its four-line
  comment)

The two structural skips stay, with their existing one-line comments:

- `region: { enabled: false }` (line 80 — picker is a fragment, not a page
  region)
- `"page-has-heading-one": { enabled: false }` (line 81 — page-level concern,
  out of scope for the picker)

After the edit, `axeConfig.rules` contains exactly two entries.

## 5. Files explicitly touched

- `apps/web/app/[locale]/wizard/WizardChrome.tsx` — `component="main"` on the
  right-pane `AppCard`.
- `packages/ui/src/theme/tokens.ts` — Option A: edit `accent` on both themes.
  Option B: add `accentInk` on both themes (and on `DeliveryTheme` interface).
- `packages/ui/src/DeliveryDatePicker.tsx` — Option B only: swap two
  `theme.onAccent` reads to `theme.accentInk` (lines 757, 808). Option A: no
  change. Plus, in either option, the closed-card / chrome Typography colour
  swap from step 3.
- `apps/web/cypress/e2e/delivery-picker/a11y.cy.ts` — remove the two
  finding-skips from `axeConfig`.

No new files. No new dependencies. No changes to `apps/web/app/[locale]/wizard/layout.tsx`.

# Contract impact

- **`schema.graphql`** — unchanged.
- **`packages/domain`** — unchanged.
- **`packages/analytics`** — unchanged. No new events.
- **`packages/ui` public surface** —
  - Option A: no surface change. Both theme objects keep the same shape; only
    the `accent` hex moves.
  - Option B: additive. `DeliveryTheme` gains one new required field
    (`accentInk`). `sorrelTheme` and `brambleTheme` each gain the value. The
    spec-031 structural check at
    `packages/ui/src/theme/__type-checks__/DeliveryTheme.types.ts` makes a
    missing field fail `yarn type-check` automatically — no extra test
    needed for shape coverage.
- **`apps/web` public surface** — unchanged. `<main>` is a presentational
  swap inside the wizard chrome.

# Out of scope

- Visual-design polish beyond the contrast pair. No spacing, no radius, no
  typography hierarchy edits, no recolour of the page tint, paper, or border
  tokens.
- A Bramble rebrand. Bramble matches Sorrel's new token shape, nothing more.
- The other two `axeConfig` skips (`region`, `page-has-heading-one`). Each
  is a real fragment- or page-level limitation tracked separately; their
  one-line comments stay.
- Filtering axe with `runOnly: ['wcag2aa']` (or any other tag). Default
  ruleset stays.
- Introducing `cypress-axe`'s violation-callback verbosity flags. Default
  reporter stays.
- The Storybook + Stripe Tier-3 closers and any other unrelated work.
- A `landmark-no-duplicate-main` regression test as a separate Cypress
  describe — the default axe ruleset already includes that rule, so
  removing the `landmark-one-main` skip covers both directions in A-01.

# Acceptance criteria

- [ ] `yarn type-check` — green (0 errors / 0 warnings).
- [ ] `yarn lint` — green.
- [ ] `yarn format:check` — green.
- [ ] `yarn workspace @sorrel/ui test` — green. If Option B, the
      `DeliveryTheme.types.ts` structural check exercises the new field for
      free; document this in the commit message.
- [ ] `yarn workspace @sorrel/web cypress run` — passes. A-01 / A-02 / A-03
      pass `color-contrast` AND `landmark-one-main` on the default axe
      ruleset. (The exact total counts are not pinned here because other
      Cypress specs may evolve; what is pinned is that the three axe cases
      go green without the two finding-skips.)
- [ ] `axeConfig.rules` in `a11y.cy.ts` contains exactly two entries:
      `region: { enabled: false }` and `"page-has-heading-one": { enabled: false }`.
      No `color-contrast` key. No `landmark-one-main` key.
- [ ] Exactly one `<main>` (or `[role="main"]`) per wizard page. Because the
      default axe ruleset includes both `landmark-one-main` (missing) and
      `landmark-no-duplicate-main` (duplicate), removing the skip in A-01
      verifies both directions; no extra Cypress case needed.
- [ ] Visual sanity check: a reviewer opens the dev server at
      `/en/wizard/delivery`, opens the picker, picks a day, and confirms the
      selected cell still reads unambiguously as "this is the picked day".
      Acceptable to flag for re-design if the chosen hex feels off; not
      acceptable to merge a contrast fix that breaks the "selected"
      affordance.
- [ ] No `eslint-disable`, no `@ts-ignore`, no `@ts-expect-error`, no
      `ignoreDeprecations` added anywhere.
- [ ] Commit subject (and every commit on the branch) carries the
      `Spec: 036` trailer.

# Analytics

None. This is a chrome + theme + a11y-config change. No new typed events. No
changes to the spec-009 contract. No changes to spec-014 funnel evidence.
`funnel_step_viewed`, `step_completed`, `field_error`, and `funnel_abandoned`
all keep their current props and their current call sites.
