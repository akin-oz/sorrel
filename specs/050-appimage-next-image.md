---
spec: 050
title: Optimize AppImage via an injectable next/image render-prop
status: proposed
approved: yes
tier: 3 # closer: perf/CLS polish on top of the credible core
owner: packages/ui · apps/web
---

# Problem / gap

`AppImage` in `packages/ui/src/app/components.tsx` (lines 475–503) renders a plain
`Box component="img"` HTML element. That path gives us:

- No AVIF/WebP transcoding (every byte is the original Storyblok asset).
- No automatic lazy loading or `fetchpriority` for above-the-fold hero art.
- No blur-up placeholder.
- No intrinsic `width`/`height` attributes, so the browser cannot reserve space
  before the asset loads — a Cumulative Layout Shift (CLS) risk on the recipe
  card grid and the hero image.

No existing approved spec covers image optimization. Spec 012 (landing redesign)
introduced the striped placeholder fallback and spec 018 introduced the App\* UI
layer, but both treat the image as a raw `<img>`. Spec 015 (CI SEO/Lighthouse)
sets a budget that CLS regressions would threaten, but did not give `AppImage`
the tooling to satisfy it.

The constraint: `packages/ui` is framework-agnostic and must **not** import
`next/image` (it is consumed by Storybook and could be consumed by non-Next
hosts). So the optimizer must be injected by the app, not imported by the package.

# Scope

Exact files, symbols, and call sites touched:

**`packages/ui/src/app/components.tsx` — `AppImageProps` + `AppImage`:**

- Add an optional render-prop to `AppImageProps`:
  ```ts
  imageComponent?: (
    props: React.ImgHTMLAttributes<HTMLImageElement> & {
      width: number;
      height: number;
    },
  ) => React.ReactNode;
  ```
  This is the exact signature `next/image`'s default export structurally
  satisfies for the props we pass; the package never names `next`.
- Add `intrinsicWidth?: number` and `intrinsicHeight?: number` to `AppImageProps`
  (the asset's natural pixel dimensions). These are **required when
  `imageComponent` is provided** and ignored on the plain-`<img>` path. They are
  deliberately named distinctly from the existing `height?: Responsive<number | string>`
  prop, which is a CSS layout height (it stays as-is and continues to drive the
  rendered box height via `sx`). The decision to enforce "required-when-present"
  is a TypeScript discriminated overload on `AppImageProps` (see Contract impact).
- `AppImage` render logic:
  - `!src` → unchanged decorative placeholder `Box` (the spec 012 stand-in).
  - `src` **and** `imageComponent` provided → call `imageComponent({ src, alt,
width: intrinsicWidth, height: intrinsicHeight, ... })` and wrap/style it so
    the rendered element keeps `width: 100%`, `objectFit: cover`, the tokenized
    CSS `height`, and `borderRadius: radius`. (The injected element receives the
    intrinsic dimensions for aspect-ratio reservation; CSS overrides the display
    size, exactly the documented `next/image` "responsive with explicit
    width/height + style" pattern.)
  - `src` **without** `imageComponent` → unchanged plain `Box component="img"`
    fallback (retained for Storybook, and any host that opts out).

**`packages/ui/src/app/AppImage.stories.tsx` (new):**

- `title: "App*/AppImage"`, matching the App\* story convention (per spec 038).
- Stories: `PlaceholderFallback` (no `src`), `PlainImg` (`src`, no
  `imageComponent`), and `WithImageComponent` — the last passes a tiny local
  stub render-prop (e.g. a plain `<img {...props} loading="lazy" />`) to
  demonstrate the injection seam **without** importing `next/image` into the
  package/Storybook build.

**`packages/ui/src/app/index.ts`:** no new export needed (`AppImage` +
`AppImageProps` already exported); confirm `AppImageProps` is exported so apps can
type their wrapper.

**`apps/web/next.config.ts`:** add `images.remotePatterns` allowing the Storyblok
CDN host so `next/image` will optimize Storyblok assets:

```ts
images: {
  remotePatterns: [{ protocol: "https", hostname: "a2.storyblok.com" }],
},
```

(The existing CSP `img-src` already allows `https:`, so no CSP change is needed.)

**`apps/web/app/_cms/Hero.tsx`:** this is the one current call site whose `src`
comes from Storyblok (`blok.image?.filename`). Pass `imageComponent={NextImage}`
(import `Image as NextImage from "next/image"`) plus `intrinsicWidth` /
`intrinsicHeight`. The intrinsic dimensions are parsed from the Storyblok asset
filename, which encodes them as `.../<width>x<height>/...`; the parse helper and
its fallback behavior (when the dimension segment is absent) must be specified
before implementation (see Out of scope / open decision).

**`apps/web/app/_cms/RecipeCard.tsx`:** the current `AppImage` call has **no
`src`** (placeholder only). It stays on the fallback path and is **not** changed
to use `imageComponent` until a real recipe image field exists. Listed here only
to confirm it was audited.

Grep confirms the only two `AppImage` consumers in `apps/web` are `Hero.tsx` and
`RecipeCard.tsx`.

# Contract impact

`schema.graphql`: none. `packages/domain`: none. This is a pure presentation /
build-config change.

Type consequence: `AppImageProps` becomes a small discriminated shape so that
`intrinsicWidth`/`intrinsicHeight` are required exactly when `imageComponent` is
present (a union of `{ imageComponent?: undefined }` and `{ imageComponent: Fn;
intrinsicWidth: number; intrinsicHeight: number }`). This is additive — existing
callers that pass neither (RecipeCard, any plain usage) keep compiling unchanged.
No generated types are affected (no codegen touches `packages/ui`).

# Out of scope

- Changing the Storyblok schema or `types/storyblok.gen.ts` to add a dedicated
  recipe image field. RecipeCard stays on the placeholder path.
- Importing `next/image` into `packages/ui` or its Storybook build.
- Blur placeholders / `blurDataURL` generation. The render-prop makes this
  possible later, but this spec ships only the seam + lazy/intrinsic-size wins.
- Changing the existing CSS `height` / `radius` props or the placeholder art.
- Any CSP edit (current `img-src 'self' data: https: blob:` already covers it).
- **Open decision deferred to the reviewer:** the exact intrinsic-dimension
  source. Two options — (a) parse `WxH` out of the Storyblok filename with a
  documented fallback, or (b) add explicit width/height literals at the Hero call
  site. The reviewer must pick one before implementation; nothing is parsed or
  hardcoded until then.

# Acceptance criteria

- [ ] `yarn type-check` green (0 errors/warnings), including the discriminated
      `AppImageProps` rejecting `imageComponent` without intrinsic dimensions.
- [ ] `yarn lint` green.
- [ ] `packages/ui` has **no** `next` import (verify by grep on the package).
- [ ] `AppImage` plain-`<img>` fallback path renders for: no-`src`,
      `src`-without-`imageComponent`, and Storybook.
- [ ] `apps/web/app/_cms/Hero.tsx` passes `imageComponent={NextImage}` with valid
      intrinsic width/height; rendered hero keeps its tokenized CSS height/radius.
- [ ] `apps/web/next.config.ts` has the `a2.storyblok.com` `remotePatterns` entry
      and a Next dev/build run optimizes the hero asset (served as AVIF/WebP, with
      width/height reserving layout space — no CLS).
- [ ] `AppImage.stories.tsx` added with the three stories listed and renders in
      Storybook.
- [ ] No CLS regression against the spec 015 Lighthouse budget on the landing
      page.

# Analytics

None. `AppImage` is a presentational component outside the funnel step flow; no
`funnel_step_viewed`, `step_completed`, `field_error`, or `funnel_abandoned`
events fire from this change.
