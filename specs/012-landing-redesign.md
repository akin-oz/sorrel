---
spec: 012
title: Landing redesign — the 9-blok marketing landing from the design handoff
status: proposed
approved: yes
tier: 2
owner: apps/web
---

# Problem / gap

The current landing (specs 010/011) is a minimal three-blok column — hero, feature grid,
CTA — centered in a 56rem container. The design handoff (`Sorrel Landing.dc.html`,
claude.ai/design bundle, 2026-06-12) specifies the real marketing landing: **nine
self-contained, reorderable Storyblok bloks** in a deliberate mobile-390 / desktop-1280
composition, with copy, recipes, and tokens lifted verbatim from this repo's
`cms-fallback.ts` and `sorrelTheme`. Nothing approved covers the six new sections or the
full-bleed responsive layout. One job: start the wizard.

# Source of truth

- **Design:** `Sorrel Landing.dc.html` from the handoff bundle is the visual contract —
  blok order, spacing, type scale, and the section background rhythm
  (paper `#FBF7F1` / page `#E8E1D3` / accent `#A14D27` band / ink `#2E2520` footer).
- **Tokens:** `sorrelTheme` (`packages/ui`) via the existing MUI theme — no new colour
  literals beyond what the tokens already define; the striped image-placeholder gradient
  stays the one already used by `RecipeCard`.
- **Content:** the typed blok contract (`types/storyblok.gen.ts`) extends to the new
  bloks; fallback content ships bilingual (en/de) per ship-only-complete.

# Scope

## Blok schema extensions (`types/storyblok.gen.ts` + renderers under `app/_cms/`)

| Blok | Fields | Renderer / notes |
|---|---|---|
| `site_nav` | `ctaLabel`, `ctaHref` | `SiteNav` — sticky-free top bar: terracotta mark + wordmark left, pill CTA right |
| `hero` (extended) | + `eyebrow`, `reassurance`, `image?` (asset) | mono eyebrow, serif headline, subcopy, CTA + reassurance line, image (striped placeholder when unset); desktop splits 2-col |
| `feature_grid` / `feature_item` (extended) | `feature_item` + `icon?` (`vet` \| `portion` \| `delivery`) | white cards; decorative geometric token-built icons (no SVG art); desktop 3-up |
| `how_it_works` | `eyebrow`, `heading`, `steps` (`how_step`[]) | numbered serif figures on the page-tint band; desktop 3-col |
| `how_step` | `title`, `body` | nested item |
| `recipe_showcase` | `eyebrow`, `heading`, `subcopy` | renders the locale's recipes from the existing `getRecipes`/`recipeFallback` source (slug-keyed, single-sourced — no recipe copy duplicated into this blok); editorial cards, desktop 3-up |
| `testimonial_section` | `eyebrow`, `items` (`testimonial_item`[]) | serif pull-quotes on the page-tint band; 1-col mobile, 2-col desktop |
| `testimonial_item` | `quote`, `attribution` | nested item |
| `faq_section` | `heading`, `items` (`faq_item`[]) | accessible disclosure accordion: real `<button>`s, `aria-expanded`/`aria-controls`, +/– affordance, 44px targets; desktop column narrows to 720px |
| `faq_item` | `question`, `answer` | nested item |
| `cta_section` (extended) | + `subcopy` | restyled as the accent band: cream mark, inverted (paper-on-accent) pill CTA |
| `site_footer` | `columns` (`footer_column`[]), `legal` | ink band; link columns; legal line |
| `footer_column` | `heading`, `links` (`footer_link`[]) | nested |
| `footer_link` | `label`, `href` | locale-aware `Link` when `href` is set, plain text otherwise (no dead anchors invented) |

All new renderers spread `storyblokEditable(blok)`; `Page`'s `renderBlok` switch and
`PageBodyBlok` union grow accordingly. Existing blok fields stay backwards-compatible
(new fields optional where the live space may not have them yet).

## Layout

- `Page` goes **full-bleed**: the 56rem container is removed; each blok owns its
  background and constrains its inner content (1120px desktop / 720px for FAQ + CTA band /
  20px side padding at mobile). Reordering bloks in Storyblok must not break neighbours.
- Mobile-first `sx` breakpoints reproduce the 390 composition; `md`+ reproduces 1280
  (hero 2-col, grids 3-up, testimonials 2-up).

## Fallback story + i18n

- `homeFallbackContent` returns the full nine-blok body in design order:
  `site_nav · hero · feature_grid · how_it_works · recipe_showcase ·
  testimonial_section · faq_section · cta_section · site_footer` — copy verbatim from
  the design (which itself lifted the existing fallback copy), with German translations
  for every new string. FAQ answers for the four questions the design leaves collapsed
  are short, authored here, and flagged for editorial review in the Storyblok space.
- Footer links: wizard CTA → `/wizard/cats`; `Recipes` → `#recipes`, `FAQ` → `#faq`
  (sections get matching `id`s); Delivery/Contact/About/Privacy/Terms ship without
  `href` (rendered as text) until those pages exist — no ghost routes.

## Accessibility

- Focus-visible on all interactive elements: 2px accent ring with 2px offset (token,
  not browser default) — added as a global rule in `globals.css`.
- WCAG AA text contrast on every surface (the design's palette already holds AA);
  decorative marks/icons `aria-hidden`; 44px minimum targets.

# Contract impact

None on `schema.graphql` or `packages/domain`. The typed blok contract grows (the same
hand-authored-until-space-sync pattern spec 011 established). No new events: spec 009's
contract has no landing-page events, and none are invented here.

# New dependencies

None.

# Out of scope (own follow-up specs)

- Real photography / CMS image assets (placeholders ship, asset field is wired).
- Delivery/Contact/About/Privacy/Terms pages; JSON-LD + sitemap (Tier-2 SEO item).
- A Bramble-skinned landing (the second theme remains picker-only proof).
- Storyblok space re-provisioning (manual, like spec 011's prerequisite).

# Acceptance criteria

- [ ] `/` and `/de` render all nine bloks from the fallback in design order, faithful to
      the handoff at 390 and 1280 — no half-translated screens
- [ ] Bloks are self-contained and reorderable: `Page` just maps `body`; every renderer
      is `storyblokEditable`
- [ ] Recipe showcase renders from `getRecipes`/`recipeFallback` (slug-keyed source) —
      no duplicated recipe copy in the blok contract
- [ ] FAQ accordion is keyboard-operable with correct `aria-expanded`/`aria-controls`
- [ ] Focus-visible ring (2px accent, 2px offset) on nav/hero/CTA/FAQ/footer interactives
- [ ] No new colour literals outside the token-derived set used by the design
- [ ] `yarn type-check` 0/0, `yarn lint` clean, existing tests green
- [ ] No real-brand names, logos, copy, or assets (fictional Sorrel only)
