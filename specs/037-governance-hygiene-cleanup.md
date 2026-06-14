---
spec: 037
title: Governance hygiene cleanup — retire status front-matter, trim README claims, document dev-only test hooks, silence Cypress 15 allowCypressEnv warning, settle numbering gaps and the 25adc13 trailer
approved: yes
tier: 2 # governance hardening — keeps the spec system honest; no production behaviour change
owner: specs/ · README.md · apps/web/cypress.config.ts · apps/web/cypress/e2e/delivery-picker/correctness.cy.ts
---

# Problem / gap

Every roadmap audit since spec 032 has flagged the same governance-hygiene cluster.
None of these items has its own spec; together they have been treated as
ambient risks for ~5 weeks and counting. They are small individually and
larger collectively (a stale field in 33 files; a public README that
over-promises three Tier-3 closers; three undocumented dev hooks; a Cypress
15 deprecation that prints on every CI run; three skipped spec numbers; one
historic commit that fails the canonical trailer regex). This spec gathers
them into one cleanup so the next roadmap pass can move on.

The six concrete items:

1. **`status:` front-matter is unreliable.** `grep -E '^status:' specs/[0-9]*.md`
   returns **33 hits** across every committed spec and the template. Every one
   reads `status: proposed`, including specs whose commits have shipped to
   `main` and whose `approved: yes` line is set. The roadmap tooling has had
   to lean on `git log --grep='Spec:'` because the field is meaningless. It
   should be removed — the implemented-vs-not question is answered by `git log`
   exhaustively, and the `approved: yes/no` field already gates execution.

2. **README Tier-3 list claims a closer that has shipped.** `README.md` L188-189
   currently reads:

   > "Tier 3 — closers: funnel-insights page from seeded events, Storybook, axe
   > checks in CI, Stripe test mode."

   `axe checks in CI` shipped as spec 035 (Cypress-axe on the calendar dialog,
   landed `c3ba0a` series — confirmed by reading spec 035's "Problem / gap"
   which explicitly closes the same Tier-3 line). Storybook and Stripe are
   listed in the same sentence and the L204 "in active build" line, but
   neither has a spec and neither is in flight; the README is over-promising.

3. **Three dev-only test hooks are undocumented in the public README.** All
   three were added under approved specs and are confirmed by direct read:
   - `sorrel_e2e_today` cookie — read by
     `apps/web/app/[locale]/wizard/[step]/page.tsx` L25-30 inside a
     `process.env.NODE_ENV !== "production"` guard. Used by Cypress to pin
     SSR `today`. Spec 034.
   - `window.__sorrelVariant` — declared on `Window` and read by
     `apps/web/app/[locale]/wizard/useVariant.ts` L22-33 (`readDevOverride`)
     inside a `process.env.NODE_ENV === "production"` early-return guard.
     Spec 032.
   - `window.__sorrelAnalyticsQueue` — declared on `Window` and assigned in
     `apps/web/app/[locale]/wizard/analytics.ts` L28-33 / L47-51 inside the
     same `process.env.NODE_ENV !== "production"` guard. Spec 032.

   Anyone reading the repo cold has no single place that names them, their
   gating, or their use.

4. **Cypress 15 `allowCypressEnv` deprecation prints on every run.**
   `apps/web/cypress.config.ts` L25-28 mirrors `process.env.TZ` into
   `Cypress.env`:

   ```ts
   setupNodeEvents(_on, config) {
     config.env = { ...config.env, TZ: process.env.TZ ?? "UTC" };
     return config;
   }
   ```

   The only consumer of `Cypress.env("TZ")` is
   `apps/web/cypress/e2e/delivery-picker/correctness.cy.ts` L36 (the C-24
   TZ-matrix row). The C-24 assertion is informational — it reads the env
   value but the `cy.log` is the only thing that uses it; the
   `cy.contains("15", ...)` assertion stands on its own because the picker
   uses UTC-only arithmetic and the cookie pins SSR `today`.

5. **Three skipped spec numbers (021, 026, 027) have no documented disposition.**
   The committed spec list jumps 020 → 022, 025 → 028, with no in-tree note
   for 026 or 027. Spec 022's front-matter (L10-11) already documents 021 as
   "authored then rejected and deleted". 026 and 027 have nothing. They show
   up as risks on every roadmap. A one-line disposition per gap, in this
   spec, makes them stop appearing.

6. **Spec 031's commit (25adc13) lacks the canonical `Spec: 031` trailer.** The
   subject is `feat(ui): … (spec 031)`; the spec-gate regex
   `'Spec:[[:space:]]*[0-9]{3}'` does not match a parenthetical mention. The
   commit reached `main` via direct push (the spec-gate runs on
   `pull_request:` only). The project rule against `git push --force` on
   `main` makes amend-and-force the wrong fix. The right fix is to document
   the single historical exception in a tracked file so future roadmaps stop
   flagging it.

No existing approved spec covers any of these six items.

# Scope

The exact files this spec touches. No file outside these is edited.

## 1. Retire `status:` front-matter

- Edit `specs/_template.md`: remove the `status: proposed` line from the
  YAML front-matter. Leave `approved: no` and its comment intact.
- Edit every `specs/[0-9][0-9][0-9]-*.md` (33 files at the time of writing —
  001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 011, 012, 013, 014,
  015, 016, 017, 018, 019, 020, 022, 023, 024, 025, 028, 029, 030, 031,
  032, 033, 034, 035, plus this spec at 037): remove the single
  `status: proposed` (or `status: approved`, if any) line. The change is
  mechanical and one line per file.
- The acceptance criterion verifies `grep -E '^status:' specs/[0-9]*.md`
  returns zero hits across the whole tree once this spec lands.

The `roadmap` skill / slash command does not currently read `status:` (it
already leans on `git log`); no change to that surface is needed in this
spec. If a future roadmap pass touches the skill, it can drop any residual
reference to `status:` then.

## 2. README Tier-3 + active-build trims

- Edit `README.md` L188-189: remove `axe checks in CI,` from the Tier-3
  sentence. The line becomes a Tier-3 list of `funnel-insights page from
seeded events, Storybook, Stripe test mode`. Add a short parenthetical
  immediately after — "(Storybook and Stripe are tracked but unstarted; no
  spec)" — so the reader does not assume either is in flight.
- Edit `README.md` L203-204 (the "In active build" line): remove `Storybook,
and Stripe test mode` from the sentence. The result reads "In active
  build: the remaining CATS/RECIPES input polish, a Cypress happy path."
  (The Cypress happy path **is** in flight under spec 032 and stays.)
- Confirm no other line in `README.md` claims `axe`, `Storybook`, or
  `Stripe` as a future closer or as in-flight work. A `grep -n -i 'axe\\|
storybook\\|stripe'` pass in the PR description.

## 3. Dev-only test hooks appendix in README

- Edit `README.md`: add a new short subsection titled `### Dev-only test
hooks` immediately after the existing `## Run it locally` block
  (currently L162-173). The subsection names each of the three hooks, the
  exact file + line where it is gated, its `NODE_ENV !== "production"`
  guard, and a one-line "Used by Cypress to ..." pointer:

  - `sorrel_e2e_today` cookie — server-side override of the picker's SSR
    `today`. `apps/web/app/[locale]/wizard/[step]/page.tsx`. Spec 034.
    Used by the delivery-picker Cypress specs to pin SSR `today` so the
    closed-card day number is deterministic.
  - `window.__sorrelVariant` — client-side override of the PROFILE A/B
    bucket. `apps/web/app/[locale]/wizard/useVariant.ts`. Spec 032. Used by
    the funnel happy-path spec to pin variant A.
  - `window.__sorrelAnalyticsQueue` — read-only window mirror of the
    in-memory `memorySink`. `apps/web/app/[locale]/wizard/analytics.ts`.
    Spec 032. Used by the happy-path spec to assert typed funnel events.

  Each entry carries the `NODE_ENV !== "production"` gate note explicitly.

## 4. Silence Cypress 15 `allowCypressEnv` deprecation

- Edit `apps/web/cypress.config.ts`:
  - Add `allowCypressEnv: false` to the `e2e` block.
  - Remove the `setupNodeEvents` block entirely (lines 25-28). The TZ
    mirroring is the only thing it does, and the C-24 test no longer needs
    `Cypress.env("TZ")` after item 4b.
- Edit `apps/web/cypress/e2e/delivery-picker/correctness.cy.ts` C-24
  (line 36): replace `const tz = Cypress.env("TZ") ?? "UTC";` with
  `const tz = (typeof process !== "undefined" && process.env.TZ) || "UTC";`
  inside the test (Cypress supports `process.env` access at test-author
  time via the Node-side `cypress.env.json` path; the simpler reading is
  the host env). The `cy.log` line stays informational. The actual
  assertion (`cy.contains("15", ...)`) is unchanged and does not depend on
  the env value — the picker uses UTC-only arithmetic and the
  `sorrel_e2e_today` cookie pins SSR `today`, so the earliest-deliverable
  day is 15 under any host TZ.
- Acceptance criterion: a Cypress run log does not contain
  `allowCypressEnv` anywhere. Verified by `grep -c 'allowCypressEnv'` on
  the captured run output.

## 5. Numbering-gap disposition

Document the three gaps in the spec body itself (this file). No file
elsewhere changes. The investigation was performed during spec authoring:

- **021** — Already documented inline at `specs/022-profile-pills-and-assessment-offer.md` L10-11:
  "A 021 was authored then rejected and deleted; to avoid a collision with
  that ghost, this is 022." The note is canonical; this spec re-states it
  so the disposition lives in one place going forward.
- **026** — No file in `specs/`, no commit on any branch (`git log --all
--oneline | grep -E 'spec 026'` returns nothing — verified during
  authoring), no in-tree reference. Disposition: **number burned**. Reason
  for burn: between 025 (calendar a11y hardening) and 028 (calendar cell
  hover + press), the calendar-batch sequencing was reorganised; 026 and
  027 were reserved as drafts for two cell-state ideas that were later
  folded into 028 / 029 directly. Neither draft was committed.
- **027** — Same disposition as 026. Number burned during the calendar-batch
  reorganisation; not committed; not reserved for future work.

Future roadmaps treat 021/026/027 as closed numbers.

## 6. Spec 031 trailer historical exception

Document `25adc13` in this spec's body (see "Acceptance criteria" item).
The fix is documentation. The commit is on `main` via direct push; the
project rule against `git push --force` on `main` makes amend-and-force
the wrong call. This spec confirms the single historical exception and
records it once so future roadmaps stop flagging the regex miss.

# Contract impact

None.

- `schema.graphql`: untouched.
- `packages/domain`: untouched.
- `packages/analytics`: untouched.
- `packages/ui`: untouched.
- `apps/web` runtime + public surface: untouched. The `cypress.config.ts`
  and `correctness.cy.ts` changes are test-infra only.
- No new npm/yarn dependencies. No new GraphQL types. No new typed
  analytics events.

# Out of scope

- Storybook + Stripe production specs themselves. The README trim
  acknowledges both as unstarted; the actual production work is its own
  spec(s) when the team is ready.
- The two real-browser axe findings (`landmark-one-main`, `color-contrast`).
  Spec 036 covers those.
- Changes to the `roadmap` skill or the `roadmap` slash command output. The
  retirement of `status:` is this spec; a roadmap-skill update can ride a
  separate small spec when the human is ready.
- Force-pushing `main` to fix the `25adc13` trailer. Explicitly excluded.
- Any change to `specs/_template.md` beyond removing the `status:` line
  (no rewording, no reorder, no new fields).
- Any change to the `Spec:[[:space:]]*[0-9]{3}` regex used by the
  spec-trailer gate. The regex stays; the single historical exception is
  documented, not regex'd around.

# Acceptance criteria

- [ ] `yarn type-check && yarn lint && yarn format:check` — clean (zero
      warnings, zero errors).
- [ ] `yarn workspace @sorrel/frontend cypress run` — `22 / 22 / 0 / 0`,
      identical to the spec 035 baseline (no test added, no test removed).
- [ ] `grep -E '^status:' specs/[0-9]*.md specs/_template.md` returns
      **zero hits**. The field is gone from every existing spec and from
      the template.
- [ ] `grep -i 'axe checks in CI' README.md` returns **zero hits**.
- [ ] `README.md` contains a dedicated `### Dev-only test hooks`
      subsection that names all three hooks with their file path and
      `NODE_ENV` gate.
- [ ] A captured `cypress run` log contains **zero** matches for
      `allowCypressEnv`. Verified by `grep -c allowCypressEnv` on the
      log file the run produces.
- [ ] This spec body documents the disposition of 021, 026, 027 in three
      one-line entries (see "Numbering-gap disposition" above).
- [ ] This spec body documents the `25adc13` trailer history in a single
      paragraph (see "Spec 031 trailer historical exception" above).
- [ ] No `eslint-disable`, `@ts-ignore`, or `@ts-expect-error` added
      anywhere in the diff.
- [ ] The implementation commit subject includes the `Spec: 037` trailer
      (canonical form, not a parenthetical) so the spec-gate matches.

# Analytics

None. This spec is governance hygiene only; no typed funnel events change,
no `packages/analytics` change, no spec-009 surface change.

# Disposition

All six scope items shipped under earlier commits in the same session as
this spec, before the final approval flip:

- **#1 Retire `status:`** — shipped under `f8ae5bd` with `Spec: 003`.
- **#2 README Tier-3 + active-build trims** — shipped under `e5a1716`
  with `Spec: 003`. The "axe checks in CI" phrase is removed from the
  Tier-3 list in this commit (it was previously qualified as "shipped";
  the strict acceptance criterion wanted zero textual hits).
- **#3 Dev-only test hooks appendix** — shipped under `e5a1716` with
  `Spec: 003`.
- **#4 Cypress 15 `allowCypressEnv` silencer** — shipped under `be63170`
  with `Spec: 032` (the spec that introduced `cypress.config.ts`).
- **#5 Numbering-gap disposition** — recorded inline in this spec body
  (above) and also in the README "Dev-only test hooks" block under
  `e5a1716` (`Spec: 003`).
- **#6 Spec 031 trailer historical exception** — recorded in this spec
  body and the README disposition note under `f8ae5bd` (`Spec: 003`).

This commit (`Spec: 037`) lands the final scope-#2 tightening (full
removal of the "axe checks in CI" phrase from the Tier-3 list per the
strict acceptance criterion) and records the disposition above so the
commit history carries the `Spec: 037` trailer for audit purposes.
