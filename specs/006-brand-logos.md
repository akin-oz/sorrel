---
spec: 006
title: Brand logo assets + themeable BrandLogo component
approved: yes
tier: 1
owner: packages/ui · apps/web
---

# Problem / gap

The funnel currently renders the brand as a plain text wordmark ("Sorrel"). The user
provided real Sorrel brand-mark SVGs (`logo.svg`, `logo-favicon.svg`, from `sorrel.zip`)
to use instead. No approved spec covers brand assets, a logo component, or the favicon.

The marks are single-path potrace SVGs with `fill="currentColor"`, so one asset tints to
either brand by changing the text colour — a clean fit for the one-component-two-skins
theming already in `packages/ui`.

# Scope

- **Assets** — add the provided SVGs to the repo:
  - `packages/ui/src/assets/sorrel-mark.svg` (the `currentColor` mark, for in-app use).
  - `apps/web/app/icon.svg` (the favicon variant, with a fixed brand fill — favicons render
    standalone, so `currentColor` would fall back to black; pin it to Sorrel `#A14D27`).
- **Component** — `BrandLogo` in `packages/ui`: inlines the mark so `currentColor` works,
  with `size`, `color` (defaults to `currentColor`), and `title` (accessible name) props.
  Tints to Sorrel or Bramble purely via the colour passed in.
- **Wiring** — export `BrandLogo` from `@sorrel/ui`; the favicon is picked up automatically
  by the App Router from `app/icon.svg`.

# Contract impact

None. No schema or domain changes.

# Out of scope

- Adding a logo slot to the delivery date picker — the design (spec 001) doesn't place one
  there; this spec doesn't change the picker UI.
- The wizard shell header that will consume `BrandLogo` — its own funnel-step spec.

# Branding note

Sorrel is a fictional brand and these are the user's own original assets — no real
competitor names, logos, copy, or assets are introduced (per `.claude/CLAUDE.md`).

# Acceptance criteria

- [ ] Both SVGs added to the repo at the paths above
- [ ] `BrandLogo` renders inline and tints correctly under both Sorrel and Bramble colours
- [ ] `app/icon.svg` set as the favicon with a fixed brand fill
- [ ] `BrandLogo` exported from `@sorrel/ui`
- [ ] `yarn type-check` green; existing 25 domain tests stay green

# Analytics

None — brand assets.
