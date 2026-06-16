---
spec: 047
title: Delivery finalization — add a proprietary LICENSE + license fields, re-home react as a peer in @sorrel/ui, pass the Stripe publishable key to the Lighthouse build, and lock variant carriage on the abandonment/exit-intent events
approved: yes
tier: 2 # JD coverage — final handoff hygiene; no production behaviour change
owner: LICENSE (new) · package.json (root + all 6 workspaces) · packages/ui/package.json · .github/workflows/lighthouse.yml · packages/analytics/src/events.test.ts · yarn.lock
---

# Problem / gap

The 2026-06-16 delivery-readiness pass (release engineer + security reviewer +
QA engineer + dependency auditor + telemetry PM) was run to answer a handoff
question — "should the repo carry a LICENSE, and what else remains to finalize
delivery?" Specs 040–044 already swept the 2026-06-15 audit, so most findings
this round were already shipped (the `ci.yml` Stripe-key build env is present at
`.github/workflows/ci.yml:66`; dependency dual-React, variant carriage on the
payment events, and the smoke docs all landed under 042/043/044). What remains
is a small cluster of finalization-hygiene items, none of which is covered by an
approved spec, and which the repo's own convention (037, 040–044) says to gather
into one cleanup spec rather than leave as ambient risk.

(The 2026-06-16 audit also flagged `rxjs` as a removable ghost dependency of
`apps/web`. That finding was **wrong** and is deliberately excluded — see
"Out of scope". `rxjs` is a peerDependency of `@apollo/client@4` and
`@apollo/client-integration-nextjs`, not auto-installed under yarn-classic;
`apps/web`'s explicit `"rxjs": "^7.8.2"` is what hoists it to satisfy Apollo.)

The four concrete findings, with severity from the audit:

1. **MINOR (Legal/IP + Deps) — no `LICENSE` file and no `license` field on any
   `package.json`.** All seven manifests (`package.json` root + `apps/web` +
   `packages/{ui,domain,analytics,shared}` + `services/api`) carry
   `"private": true` but no `"license"` field, and there is no top-level
   `LICENSE` file. A repo with no license is "all rights reserved" by copyright
   default, so nothing is accidentally granted — but the intent is ambiguous to
   a reviewer, `yarn`/`npm` tooling warns on the missing field, and GitHub's
   dependency graph reports "undefined license". For a portfolio artifact of a
   fictional brand shared with a hiring panel, MIT/open-source would be wrong
   (it would grant redistribution rights); the correct signal is a proprietary
   "evaluation only" notice plus `"license": "UNLICENSED"`.

2. **MINOR (Deps) — `@sorrel/ui` declares `react` in `dependencies`, not
   `peerDependencies`.** `packages/ui/package.json` lists `"react": "^19.2.4"`
   under `dependencies`. A component library should treat React as a peer so the
   host app (`apps/web`) owns the single instance; the current declaration is
   the wrong semantic and would risk a duplicate-React install if `@sorrel/ui`
   were ever consumed outside this monorepo. (Spec 042 §1 collapsed the dual
   React install at the lockfile level; this is the manifest-semantics
   follow-on it did not address.)

3. **MINOR (Release) — `.github/workflows/lighthouse.yml` builds without the
   Stripe publishable key.** The `Build` step at
   `.github/workflows/lighthouse.yml:35-36` runs
   `yarn workspace @sorrel/frontend build` with no `env:` block. Spec 040 §B5
   fixed exactly this for `ci.yml` (`.github/workflows/ci.yml:66`) but the
   Lighthouse workflow was not in 040's owner list and still builds a bundle
   where `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is empty. The build does not fail
   (`CheckoutForm.tsx` guards the empty key), but the Lighthouse run exercises a
   bundle whose CHECKOUT step renders the "not configured" state, so any
   Lighthouse pass over a checkout-adjacent route is measuring a degraded page.

4. **MAJOR (QA) — variant carriage is not asserted on the three
   abandonment/exit-intent events.** Commit `217a8c4` (2026-06-15) added
   `variant` to `funnel_abandoned`, `exit_intent_shown`, and
   `exit_intent_recovered` in the seed scripts, and the events already carry
   `variant?: string` in the typed contract (`packages/analytics/src/events.ts`).
   But the `describe("variant carriage (spec 043)")` block in
   `packages/analytics/src/events.test.ts:74-114` only asserts carriage on
   `step_completed`, `funnel_step_viewed`, and the three payment events. The
   three abandonment/exit-intent events are emitted in the test only without a
   `variant` (`events.test.ts:40-41,67`). Because the property is optional, a
   caller (or a future seed regression) could silently drop `variant` on these
   events with no test failure — which is the exact data-integrity class spec
   043 set out to lock.

# Scope

- **`LICENSE`** (new, repo root): a short proprietary notice —
  `Copyright (c) 2026 Akin Oztorun. All rights reserved.` plus an
  "evaluation only; no reproduction/distribution/use without written
  permission" paragraph.
- **`"license": "UNLICENSED"`** added to all seven manifests: `package.json`
  (root), `apps/web/package.json`, `packages/ui/package.json`,
  `packages/domain/package.json`, `packages/analytics/package.json`,
  `packages/shared/package.json`, `services/api/package.json`.
- **`packages/ui/package.json`**: move `"react"` (and `"react-dom"`, currently
  in `devDependencies`) into a `peerDependencies` block as `"^19.2.4"`; keep a
  `react`/`react-dom` `devDependency` for the package's own jest/storybook runs.
- **`.github/workflows/lighthouse.yml`**: add an `env:` block to the `Build`
  step passing `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (and the PostHog/Mixpanel
  public keys, matching the `ci.yml` pattern) from repository secrets.
- **`packages/analytics/src/events.test.ts`**: add a test case asserting that
  `funnel_abandoned`, `exit_intent_shown`, and `exit_intent_recovered` preserve
  `variant` through tracker→sink.
- **`yarn.lock`**: regenerated by `yarn install` after the manifest edits.

# Contract impact

None. No change to `schema.graphql`, `packages/domain`, or the
`packages/analytics` event contract (`events.ts` already declares
`variant?: string` on the affected events — this spec only adds a test that
exercises the existing field). No generated-type consequence.

# Out of scope

- **Removing `rxjs` from `apps/web` dependencies.** The 2026-06-16 audit called
  it a ghost dep "available transitively via `@apollo/client`". That is wrong:
  `rxjs ^7.3.0` is a _peerDependency_ of `@apollo/client@4` and
  `@apollo/client-integration-nextjs`, and yarn-classic does not auto-install
  peer deps. `apps/web`'s explicit `"rxjs": "^7.8.2"` is the hard dependency
  that hoists `rxjs@7.8.2` to the root and satisfies Apollo's peer requirement
  (the only other hard `rxjs@^7` declarant is `wait-on`, a transitive dev tool;
  `inquirer` provides only `rxjs@^6`, the wrong major). Removing it would risk
  an unresolved `import from "rxjs"` in Apollo at build time. It stays.
- **Promoting the CSP from `Content-Security-Policy-Report-Only` to enforcing**
  (`apps/web/next.config.ts:55`). Spec 041 shipped it report-only deliberately,
  pending a preview walk to confirm no legitimate resource is blocked. Flipping
  it is a behaviour change that warrants its own spec + a documented preview
  walk; it is not finalization hygiene.
- **All live/operational handoff steps**, which are not tracked-file changes and
  cannot be gated by a spec: re-seeding the live PostHog + Mixpanel projects
  with the post-`217a8c4` variant data (keep-first dedup means the stale
  null-variant cohort persists — filter `variant IS NOT NULL` or reset the
  project); confirming the Vercel Production env has the `NEXT_PUBLIC_*` build
  keys + server-only PostHog keys; confirming the `profile-input` PostHog flag
  exists at 50/50; and re-running `yarn lighthouse` to refresh `docs/lighthouse.md`.
  These remain the maintainer's manual pre-handoff checklist.
- Migrating ESLint in `apps/web` from `^9` to `^10`, or raising the
  `typescript-eslint` peer ceiling. Both are latent toolchain-version items, not
  finalization blockers; tracked but not in this spec.
- Dropping the deprecated transitive packages (`glob@7`, `rimraf@2/3`,
  `inflight@1`). Same out-of-scope note as spec 042.

# Acceptance criteria

- [ ] A top-level `LICENSE` file exists with a proprietary "all rights
      reserved / evaluation only" notice.
- [ ] `grep -L '"license"' package.json apps/web/package.json packages/*/package.json services/api/package.json`
      returns no files (every manifest has a `"license"` field, set to
      `"UNLICENSED"`).
- [ ] `packages/ui/package.json` has a `"peerDependencies"` block containing
      `react` and `react-dom`, and no `"react"` entry remains in its
      `"dependencies"`.
- [ ] `.github/workflows/lighthouse.yml` `Build` step has an `env:` block with
      `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- [ ] `packages/analytics/src/events.test.ts` asserts `variant` carriage on
      `funnel_abandoned`, `exit_intent_shown`, and `exit_intent_recovered`; the
      new case fails if `variant` is dropped from any of the three.
- [ ] `yarn install` from the existing tree exits 0 and produces only the
      expected `yarn.lock` diff (no React/dom version churn — single entry each).
- [ ] `yarn type-check && yarn lint && yarn format:check` — clean (0 warnings,
      0 errors).
- [ ] `yarn workspaces run test` — every workspace's jest suite green,
      including the new `events.test.ts` case.
- [ ] `yarn workspace @sorrel/frontend build` — exits 0.
- [ ] `grep -E '^react@' yarn.lock | wc -l` and
      `grep -E '^react-dom@' yarn.lock | wc -l` each still return `1`
      (the peer re-home must not split React).
- [ ] No `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or
      `ignoreDeprecations` added anywhere in the diff.
- [ ] The implementation commit subject(s) include the `Spec: 047` trailer
      (canonical form).

# Analytics

None changed. This spec adds a contract **test** that exercises the existing
`variant?: string` property on `funnel_abandoned`, `exit_intent_shown`, and
`exit_intent_recovered`; it introduces no new typed event and alters no event
prop. The emit sites for those events (`FunnelProvider.tsx`, `WizardChrome.tsx`)
are unchanged.
