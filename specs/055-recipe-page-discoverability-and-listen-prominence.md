---
spec: 055
title: Make recipe pages reachable from the landing showcase and the Listen button prominent
status: accepted
approved: yes # ONLY a human flips this to yes — implementation is gated on it
tier: 3 # closer — finishes spec 053 so the feature can actually be found
owner: apps/web · packages/ui
---

# Problem / gap

Spec 053 shipped the Listen button on `/[locale]/recipes/[slug]`, but users can't find it:

1. **Nothing links to recipe pages.** Spec 011 built `/recipes/[slug]` as a Storyblok
   preview route. The landing `RecipeShowcase` renders `RecipeCard`s with no link,
   so the page (and the button) are reachable only by typing the URL.
2. **The button reads as secondary.** `ListenButton` is an `outlined` `AppButton`
   with a muted border on the paper background. It is the page's only action, yet
   the eye skips over it (confirmed on production, 2026-10-02).

Spec 053 deliberately covered only the button and the route, so no approved spec
covers either fix.

# Scope

## A — Recipe cards link to their page (landing showcase only)

- **`RecipeCard`** (`apps/web/app/_cms/RecipeCard.tsx`) gains an optional `href?: string`.
  - With `href`, the recipe name renders as an `AppLink` (`component={Link}`, safe
    here because `RecipeCard` is `"use client"`), stretched to cover the whole
    card. One tab stop, the card name is the accessible name, and there is no
    nested-interactive problem.
  - Without `href`, the card renders exactly as today.
- **`RecipeShowcase`** passes `href={`/recipes/${recipe.slug}`}`. The next-intl `Link`
  adds the locale prefix.
- **`packages/ui`** — two additive props, no `sx` in `apps/web`:
  - `AppLink.stretched?: boolean` — adds `::after { content:""; position:absolute; inset:0 }`.
  - `AppCard.interactive?: boolean` — sets `position: relative`. On hover the border
    moves to `primary.main` and the card lifts 2px (`transition` 150 ms;
    `prefers-reduced-motion` drops the lift and keeps the colour change). On
    `:focus-within` it shows the theme's 2px focus ring, so the stretched link has
    a visible focus state on the whole card.
- **`RecipesPicker` (wizard) is unchanged.** It reuses `RecipeCard` with an Add
  button underneath. A link there would nest interactive targets and send people
  out of the funnel mid-selection, which is a conversion regression.

## B — Listen button reads as the page's primary action

- `ListenButton` switches to `variant="contained"`, `size="large"`, with a leading
  inline-SVG icon (`aria-hidden`, `currentColor`, 20px). Inline SVG follows the
  existing pattern in `CheckoutForm`/`SummaryForm`/`FeatureItem`, so no icon dependency.
- The icon changes with state; the labels stay as spec 053 defined them:

  | State   | Icon                                           | Label          |
  | ------- | ---------------------------------------------- | -------------- |
  | idle    | speaker                                        | Listen         |
  | loading | 3-dot pulse                                    | Loading audio… |
  | playing | 3 equaliser bars animating, plus a pause glyph | Pause          |
  | paused  | play triangle                                  | Resume         |
  | error   | circular-arrow retry                           | Retry          |

  Under `prefers-reduced-motion: reduce` the bars and dots render static.

- The button's width stays fixed across states (the widest label sets `min-width`),
  so it does not shift when the label changes.
- Placement: unchanged (above the card, under the breadcrumb).

## Analytics

None new. A card click is a plain navigation. `tts_*` events are unchanged.

# Contract impact

- `schema.graphql`, `packages/domain`, `packages/analytics`: none.
- `packages/ui` public API: additive optional props `AppLink.stretched` and
  `AppCard.interactive`. Existing callers are unaffected.

# Out of scope

- Links from the wizard `RecipesPicker`, footer or nav.
- A "Start a plan with this recipe" CTA on the recipe page. It would turn the page
  from a dead end into a funnel entry, but it is a separate conversion decision
  that needs its own spec.
- Recipe page layout or visual redesign beyond the button.
- Any change to `ListenButton` behaviour, states, events or copy.

# Acceptance criteria

- [ ] Landing: each showcase card navigates to `/[locale]/recipes/[slug]`. One tab
      stop per card, focus ring visible on the whole card, Enter navigates
- [ ] Wizard picker cards are unchanged: no link, Add button works (existing
      Cypress happy path stays green)
- [ ] Listen button is contained/large with per-state icons. No layout shift across
      states. Reduced-motion makes the icons static
- [ ] Contrast: button label and icon ≥ 4.5:1 on the primary fill; card focus ring ≥ 3:1
- [ ] Unit: `RecipeCard` renders a link only when `href` is passed
- [ ] Cypress: landing → click first recipe card → recipe page → Listen visible;
      `listen.cy.ts` still green
- [ ] `yarn type-check`, `yarn lint`, all unit tests green; Impeccable detector clean
      on changed files
- [ ] Desktop and 400px screenshots of the landing showcase and the recipe page
