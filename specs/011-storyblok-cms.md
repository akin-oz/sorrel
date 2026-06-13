---
spec: 011
title: Storyblok CMS + i18n — modular landing + recipes, visual editing, revalidation, en/de
status: proposed
approved: yes
tier: 2
owner: apps/web · packages/ui · packages/domain
---

# Problem / gap

The plan names Storyblok as the content layer — "landing sections modular + reorderable,
CMS-driven" and "recipe cards… content from Storyblok" — and the Tier-2 roadmap lists
"CMS-driven landing/recipe content with draft preview and publish webhook to revalidateTag."
Nothing covers it yet: the landing (spec 010) is static, the RECIPES step is a placeholder,
and there is no CMS. This spec integrates Storyblok across both surfaces with the full
editorial workflow, so the artifact demonstrates real Storyblok fluency — not just a fetch.

It also extends the project's thesis to content: **the blok schema is a generated, typed
contract**, the third firewall alongside `schema.graphql` (network) and `@sorrel/analytics`
(events). Invented content fields become type errors.

# Source-of-truth split (the load-bearing decision)

Recipes exist in two systems; this is deliberate, not duplication:

- **Storyblok owns editorial content** — recipe name, description, imagery, marketing copy,
  and display dietary tags. Authored and previewed in the visual editor.
- **GraphQL + `packages/domain` own funnel state** — availability, pricing, portion calc,
  program suitability (already canonical per `source-of-truth.md`).
- **`slug` is the join key** (the schema's `Recipe.slug` is described as exactly this stable
  identifier). A recipe card composes Storyblok editorial with funnel state by `slug`.

In this spec, recipe cards render **editorial only**; the availability/suitability join from
the GraphQL `recipes` query lands with the Apollo client (its own follow-up spec). CMS
`DietaryTag` option values mirror the schema's `DietaryTag` enum (`GRAIN_FREE`,
`CHICKEN_FREE`, `SENSITIVE`) so the join stays clean — asserted by a small sync test, the
same pattern as `FUNNEL_STEPS` ↔ schema in spec 009.

# Scope

## SDK + initialisation

- Dep `@storyblok/react` (App Router / RSC entry). `apps/web/storyblok.ts` calls
  `storyblokInit({ accessToken, use: [apiPlugin], components, bridge })` and exports
  `getStoryblokApi`. The component map binds each blok to an MUI-built renderer.
- Tokens are server-side; the visual-editor Bridge loads **only in draft mode**.

## Bloks → MUI renderers

Content types and nestable bloks (schema authored in the space; shapes below). Each maps to a
component under `apps/web/app/_cms/`:

| Blok                    | Fields                                                                       | Renderer               |
| ----------------------- | ---------------------------------------------------------------------------- | ---------------------- |
| `page` (content type)   | `body` (bloks)                                                               | `Page` — maps children |
| `hero`                  | `headline`, `subcopy`, `ctaLabel`, `ctaHref`                                 | `Hero` (MUI)           |
| `feature_grid`          | `heading`, `items` (`feature_item`[])                                        | `FeatureGrid`          |
| `feature_item`          | `title`, `body`                                                              | `FeatureItem`          |
| `cta_section`           | `heading`, `ctaLabel`, `ctaHref`                                             | `CtaSection`           |
| `recipe` (content type) | `name`, `slug`, `description`, `image` (asset), `dietaryTags` (multi-option) | `RecipeCard`           |

Every blok renderer spreads `storyblokEditable(blok)` so the visual editor can select it.

## Landing page (`/`)

- `app/page.tsx` fetches the `home` story (draft when `draftMode()` is on, else published) and
  renders `<StoryblokStory>`. The hero/value-props/CTA built in spec 010 become the **fallback
  story** (below) and the blok renderers, so the page looks identical when first wired.
- Sections are reorderable in Storyblok — the React side just maps `body`.

## RECIPES step (`/wizard/recipes`)

- The RECIPES placeholder becomes real: fetch `recipe` stories, render selectable `RecipeCard`s
  with a dietary-tag filter (chips). Selection toggles a slug in funnel state.
- New reducer action in `app/wizard/state.ts`: `TOGGLE_RECIPE` (adds/removes a slug in
  `recipeSlugs`); unit-tested. No other step changes.
- Out of scope here: availability/`suitablePrograms` from GraphQL (Apollo-client spec).

## Visual editing + draft preview

- `app/api/draft/route.ts` — validates the Storyblok preview signature, enables `draftMode()`,
  redirects to the previewed path. `app/api/draft/disable/route.ts` clears it.
- In draft mode the layout loads `StoryblokBridgeLoader` for live in-editor updates; published
  mode ships zero CMS JS for editing.
- Draft reads use `version: "draft"` + the preview token; published reads use
  `version: "published"`.

## On-publish revalidation

- `app/api/storyblok/revalidate/route.ts` — verifies `STORYBLOK_WEBHOOK_SECRET`, then
  `revalidateTag("cms")` (and the specific `story:<slug>` tag). All CMS fetches set
  `next: { tags: ["cms", "story:<slug>"] }`, so a publish refreshes the live site with no
  redeploy. This is the "publish webhook → revalidateTag" Tier-2 item.

## Typed bloks (contract-first)

- Dev dep `storyblok-generate-ts`. `yarn storyblok:types` pulls the space component schema
  (via the Storyblok CLI, `npx storyblok pull-components`) and generates
  `apps/web/types/storyblok.gen.ts`. Renderers type their `blok` prop from the generated
  types — no hand-written content types. The generated file is committed; a drift check can
  join CI later.

## Internationalisation (next-intl + Storyblok, en/de) — fully bilingual

Plan item "next-intl en and de with hreflang", pulled into this spec. "Ship only complete"
means no half-German screens — every user-visible string localises.

- Dep `next-intl`. Locales `en` (default) + `de`. Everything under `app/` (landing, `wizard/*`,
  the root layout) moves under **`app/[locale]/`**, with a `middleware.ts` for locale
  negotiation and `setRequestLocale` to keep routes statically rendered.
- **Message catalogs** `messages/en.json` + `messages/de.json` hold every static UI string —
  the wizard chrome (Back / Continue / Confirm plan / Resume / "Welcome back…" / "Step N of 7"),
  all seven step titles + subcopy (moved out of `steps/index.tsx`), and the exit-intent modal
  copy. Read via `useTranslations` / `getTranslations`.
- **Locale-aware navigation**: the wizard uses next-intl's `Link` / `useRouter` so step nav
  and the landing CTA preserve the active locale (replaces the plain `next/navigation` calls in
  the spec-010 chrome). A small **locale switcher** (EN/DE) sits in the header.
- **hreflang**: `generateMetadata` emits `alternates.languages` (en/de) per route.
- **CMS content** (landing + recipes) is fetched per-locale via the Storyblok CDN `language`
  param (**field-level** translation, one content tree); untranslated fields fall back to the
  default dimension (Storyblok default).
- **Picker dates** (`packages/ui`): `DeliveryDatePicker` gains a `locale` prop; month/weekday
  labels and the "Monday 15 June" closed-card render via `Intl.DateTimeFormat`, not the
  hardcoded English arrays. The wizard passes the active locale.
- **Blocked-day reasons** (`packages/domain`): `blockedInfo` returns a **structured reason**
  (`{ code, params }`) instead of a baked English sentence; the UI formats it via next-intl, so
  the aria text localises too. This separates pure logic from presentation — but it changes the
  `blockedInfo` shape, so the `services/api` resolver (spec 008) and the domain/ui tests update
  to match.

## Graceful fallback (ship-only-complete)

When no Storyblok token is set (`STORYBLOK_PREVIEW_TOKEN` / `STORYBLOK_PUBLIC_TOKEN` absent),
`getStory` returns a hardcoded fallback `home` story and a small default recipe set, so
`next build`, the deterministic demo, and CI stay green with zero CMS config — mirroring the
`memorySink` default for PostHog (spec 010). The fallback content equals the spec-010 landing.

# Manual provisioning (prerequisite, like the PostHog key)

The user creates the space and content in Storyblok (the visual editing _is_ the showcase):

- Create a space; define the bloks above; author the `home` story and a few `recipe` stories.
- Set the space **Visual Editor** preview URL to `https://<site>/api/draft?...`.
- Add a **publish webhook** → `https://<site>/api/storyblok/revalidate`.
- Add tokens to local `.env` and Vercel: `STORYBLOK_PREVIEW_TOKEN`, `STORYBLOK_PUBLIC_TOKEN`,
  `STORYBLOK_REGION` (eu/us), `STORYBLOK_WEBHOOK_SECRET`.
- Add **`de`** as a language in the space (Settings → Internationalization) and translate the
  `home` + recipe fields in the visual editor (field-level).

# Contract impact

No `schema.graphql` change. Adds a **third generated contract** (the typed bloks); the CMS
`dietaryTags` option set mirrors the schema `DietaryTag` enum (sync test, read-only). **One
`packages/domain` change**: `blockedInfo` returns a structured `{ code, params }` reason
instead of an English sentence (so the picker's blocked-day aria text can localise). This is
internal to the domain — no schema field changes — but the `services/api` resolver and the
domain/ui unit tests update to the new shape.

# Out of scope (own follow-up specs)

- GraphQL availability/suitability join on recipe cards — the Apollo-client spec.
- The other step forms (CATS count, PROFILE, PLAN, EMAIL).
- CI drift check for generated bloks + a Storyblok management-API content seed — later.

# New dependencies (flagged for approval)

| Package                 | Type             | Reason                                       |
| ----------------------- | ---------------- | -------------------------------------------- |
| `@storyblok/react`      | dep (`apps/web`) | SDK, RSC rendering, the visual-editor Bridge |
| `storyblok-generate-ts` | devDep (root)    | generate typed bloks from the space schema   |
| `next-intl`             | dep (`apps/web`) | en/de routing, message catalogs, hreflang    |

The Storyblok CLI is used via `npx storyblok` (no install). No content SDK leaks past the
`_cms/` renderers and `storyblok.ts`.

# Acceptance criteria

- [ ] Landing renders from the `home` story (published), and from the fallback when no token
      is configured — identical content to the spec-010 landing in fallback
- [ ] Bloks map to MUI renderers; each is `storyblokEditable` and selectable in the editor
- [ ] Draft preview works: `/api/draft` enables `draftMode`, the Bridge live-updates in-editor,
      disable route clears it
- [ ] Publish webhook verifies its secret and `revalidateTag`s — a publish updates the live
      site with no redeploy
- [ ] RECIPES step renders Storyblok recipe cards with a dietary-tag filter; selecting writes
      `recipeSlugs` via the `TOGGLE_RECIPE` reducer action (unit-tested)
- [ ] Typed bloks generated into `types/storyblok.gen.ts`; renderers use them, no hand-written
      CMS types; CMS `dietaryTags` ↔ schema `DietaryTag` sync test passes
- [ ] `@storyblok/react` is referenced only under `_cms/` + `storyblok.ts`
- [ ] `/` + `/de` and `/wizard/cats` + `/de/wizard/cats` render; every static UI string
      resolves from `messages/en.json` + `de.json` — switching locale flips the whole funnel,
      no half-translated screens; a locale switcher is in the header
- [ ] hreflang `alternates` emitted per route; CMS content fetched per-locale via the
      `language` param (de falls back to default fields)
- [ ] Picker labels + closed-card date localise via `Intl`; blocked-day aria reasons localise
      via structured codes; `services/api` + domain/ui tests updated to the new `blockedInfo`
      shape and stay green
- [ ] `yarn type-check` green (0/0); existing tests stay green; `next build` succeeds with and
      without a token, in both locales
- [ ] No real-brand names, logos, copy, or assets (fictional Sorrel only)

# Analytics

No new event types. The RECIPES step continues to fire `funnel_step_viewed` / `step_completed`
through the spec-009 contract; recipe selection is funnel state, not a new event.
