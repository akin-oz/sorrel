---
spec: 054
title: Fix the recipe detail page 500 — server page passes a function to the client AppLink
status: accepted
approved: yes # ONLY a human flips this to yes — implementation is gated on it
tier: 1 # credible core — a public route returns 500
owner: apps/web
---

# Problem / gap

`/[locale]/recipes/[slug]` (spec 011) returns **500 on `main`**, found while
verifying spec 053. The page is a server component and renders the breadcrumb as
`<AppLink href="/" component={Link}>`. `AppLink` lives in
`packages/ui/src/app/components.tsx`, which is `"use client"`, so `component` has to
cross the RSC boundary. `Link` is a function, so Next throws:

> Functions cannot be passed directly to Client Components unless you explicitly
> expose it by marking it with "use server".

Confirmed by rendering the page at `HEAD` (`2af33c7`), before any spec 053 change:
`GET /en/recipes/wild-caught-salmon` → 500. No existing approved spec covers this.
Spec 018 moved the page onto `AppLink` without a test that renders the route.

# Scope

One line in `apps/web/app/[locale]/recipes/[slug]/page.tsx`: render the breadcrumb as
a plain anchor to the locale home, `<AppLink href={`/${locale}`} color="inherit">`,
and drop the now-unused `Link` import. The page already knows `locale`, so the
next-intl `Link` adds nothing here.

Verified locally (uncommitted, then reverted) during spec 053: with this change the
route renders 200, and `cypress/e2e/recipe/listen.cy.ts` passes 2/2.

# Contract impact

None.

# Out of scope

- Changing `AppLink` itself, or the other `component={Link}` call sites. Those are
  all inside client components (`SiteNav`, `Hero`, `CtaSection`, `WizardChrome`),
  so the function never crosses the boundary there.

# Acceptance criteria

- [ ] `GET /en/recipes/wild-caught-salmon` → 200 in `next dev` and `next start`
- [ ] `yarn type-check` and `yarn lint` green
- [ ] `cypress/e2e/recipe/listen.cy.ts` green, which is also the regression test for
      this route rendering

# Analytics

None.
