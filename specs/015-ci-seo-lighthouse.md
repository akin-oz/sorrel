---
spec: 015
title: CI + SEO + Lighthouse — make "wrong is un-mergeable" visible in the PR tab
approved: yes
tier: 2
owner: .github · apps/web
---

# Problem / gap

The governance harness is the free differentiator — but it lives only in **local** hooks, so
"wrong is un-mergeable" isn't visible where a reviewer looks: the **PR tab**. And the README's
performance/SEO posture is unbacked:

- **No `.github/` at all** — the `Spec: NNN` trailer gate, source-of-truth gate, and Stop
  verification are invisible in CI.
- The **Stop gate is narrower than documented** — `verify-on-stop.sh` runs only type-check +
  domain tests (not lint, not api/analytics). CI must be the honest, fuller gate.
- **No Lighthouse evidence** for the 95+ mobile target; **no `sitemap`/`robots`/JSON-LD** —
  even though `FaqSection` already renders the typed data FAQ JSON-LD needs.

# Scope

## CI — the fuller gate

- `.github/workflows/ci.yml`: `yarn type-check`, **per-workspace lint** (root `yarn lint` exists
  now — run it), the full test matrix (domain/api/analytics/shared/frontend), `codegen:check`,
  `format:check`. This is the gate the Stop hook approximates locally.

## CI — governance mirror (the tiebreaker, made provable)

- `.github/workflows/spec-gate.yml`: fail any PR whose commits lack a `Spec: NNN` trailer, and
  whose feature-area changes have no `approved: yes` spec — the local guard, mirrored in the PR
  tab. The git log + the green checks become the demo.

## Lighthouse budget gate

- `lighthouserc.json` mobile budget (perf ≥ 0.95) run in CI on the landing + a wizard step; a
  committed screenshot for the README. LCP levers: keep landing RSC-static, `display:swap` +
  preload the hero font, `priority`/`sizes` on the LCP image, `revalidate` on the CMS call,
  minimise client islands.

## SEO / structured data

- `app/sitemap.ts`, `app/robots.ts`, `metadataBase` + `alternates.languages` (hreflang already
  emitted — formalise it), Product + **FAQ JSON-LD** (FaqSection already has the data).

# Contract impact

None. CI + metadata only.

# Out of scope

- Apollo write-path (013), funnel evidence (014).
- Cypress happy-path + axe-in-CI — Tier-2/3 follow-ups (cut order: Storybook → insights →
  Stripe → Cypress).

# New dependencies (flagged for approval)

| Package     | Type          | Reason                    |
| ----------- | ------------- | ------------------------- |
| `@lhci/cli` | devDep (root) | Lighthouse CI budget gate |

# Acceptance criteria

- [ ] `ci.yml` runs type-check + per-workspace lint + full test matrix + `codegen:check` + `format:check`
- [ ] `spec-gate.yml` fails PRs missing a `Spec: NNN` trailer or an approved spec for the feature area
- [ ] Lighthouse mobile budget gate (perf ≥ 0.95) runs in CI; a screenshot is committed for the README
- [ ] `sitemap.ts` + `robots.ts` + `metadataBase`/`alternates` + Product/FAQ JSON-LD present
- [ ] README perf/SEO claims are now backed by CI evidence (no claim-vs-reality gap)
- [ ] No real-brand names/assets

# Analytics

None — release infrastructure.
