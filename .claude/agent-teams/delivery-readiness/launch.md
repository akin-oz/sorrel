# Team 4 — delivery-readiness

A supportive, pre-delivery task force that HELPS the maintainer find and close every gap before
shipping or presenting Sorrel. Five read-only investigators sweep the codebase from five
angles — release/DevOps, security, dependencies, telemetry/conversion, and release-QA — and a
lead merges their findings into one severity-ranked, maintainer-actionable pre-delivery checklist.

## Delivery context

The demo must run flawlessly from a clean clone — a fresh checkout must build and the
funnel must run first try. The project's **deterministic-verification standard expects a green,
meaningful suite the maintainer can run and extend**, so the suite must be green, meaningful, and
runnable + extensible from a clean clone. **Pixel fidelity is a core project standard** and the
**mobile Lighthouse 95+ screenshot** is a release check — the perf evidence must be *current*, not
stale. Storyblok hands-on (CMS / draft preview / revalidate) is a differentiator that has to
actually work in the demo.

This is the safety net before the demo: nothing here mutates code. Each investigator only
reads, greps, globs, and runs read-only shell checks, then returns a prioritized gap list with
**severity + concrete fix + file/evidence**. The point is to catch the red CI badge, the leaked
key, the broken hoist, and the empty dashboard *before* a reviewer does.

## Members (subagent definitions in `.claude/agents/`)

| Investigator | Subagent type | Area | Model |
|---|---|---|---|
| Release engineer | `readiness-devops-release` | CI gates green + meaningful, Vercel deploy config, env-var wiring (build vs runtime; `apps/web/.env` vs Vercel), Node 24 pin + fresh-clone reproducibility, lockfile integrity, preview↔prod parity, codegen/build order | sonnet |
| Security reviewer | `readiness-security-reviewer` | Secret exposure (audit every `NEXT_PUBLIC_*`; prove `POSTHOG_PERSONAL_API_KEY` never goes client-side), input validation (EMAIL action, GraphQL inputs), security headers/CSP, draftMode + preview-secret + webhook-HMAC, no-real-brand governance | **opus** |
| Dependency auditor | `readiness-dependency-auditor` | MUI v9 / React 19 / Next 16 compatibility, peer-dep warnings, deprecations, duplicate/hoisted copies (the prettier `.bin` gotcha), lockfile drift, `@sorrel/*` ranges, the transitively-hoisted `@mui` after spec 018 | sonnet |
| Telemetry/conversion PM | `readiness-telemetry-conversion` | Funnel events firing end-to-end to PostHog + Mixpanel (not just `memorySink`), seed→insights pipeline, A/B flag resolves in prod, dashboards exist + populated, attribution sound, story survives a sceptical walkthrough | sonnet |
| Release-QA engineer | `readiness-qa-engineer` | Every workspace's tests green AND meaningful (assert behaviour, cover edges), determinism/flake risk, the **missing Cypress happy-path e2e** (CATS→SUMMARY) as the headline gap, a manual pre-delivery smoke checklist (each wizard step, calendar, locale en/de, landing, /insights, draft preview), and whether the maintainer can run/extend the suite from a clean clone | sonnet |

All five are `tools: Read, Glob, Grep, Bash` (read-only). Seed tasks per member live in
`tasks.md`.

## Prerequisite

Agent teams are experimental and gated behind an env flag — already set in this environment:

```
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

If you spawn this team from a fresh shell, export it first.

## Paste-prompt to spawn the task force

Paste this to the lead (the main session) to launch all five in parallel:

---

> Spin up the **delivery-readiness** task force to pre-flight Sorrel before delivery. Context:
> the demo must run flawlessly from a clean clone, so a fresh checkout must build and the funnel
> must run first try; the deterministic-verification standard expects a green, meaningful suite the
> maintainer can run and extend; pixel fidelity + the mobile Lighthouse 95 evidence
> must be current. Launch these five read-only investigators **in parallel**, each scoped to
> the whole repo:
>
> 1. **Release engineer** — subagent `readiness-devops-release`. Area: CI gates (`.github/workflows/`)
>    green AND meaningful, Vercel deploy config (note: no `vercel.json`), env-var wiring
>    (`apps/web/.env` symlink vs Vercel dashboard; which `NEXT_PUBLIC_*` are needed at *build*
>    time), Node 24 pin + fresh-clone reproducibility, lockfile integrity, preview↔prod parity,
>    and the codegen→type-check→build order.
> 2. **Security reviewer** — subagent `readiness-security-reviewer`. Area: audit every
>    `NEXT_PUBLIC_*`, and **prove** the proposed server-only `POSTHOG_PERSONAL_API_KEY` (spec 023)
>    can never become `NEXT_PUBLIC_*` or reach a Client Component; input validation (the EMAIL
>    server action, GraphQL mutation inputs at `app/api/graphql/route.ts`); security headers/CSP
>    (currently none in `next.config.ts`); draftMode + preview-secret + webhook-HMAC routes; and
>    the no-real-brand governance rule.
> 3. **Dependency auditor** — subagent `readiness-dependency-auditor`. Area: MUI v9 / React 19 /
>    Next 16 compatibility, peer-dep warnings yarn-classic swallowed, deprecations,
>    duplicate/hoisted copies (the prettier `.bin` v2.8.8 gotcha), lockfile drift, `@sorrel/*`
>    workspace ranges, and the `@mui` that `apps/web` now gets only via a transitive hoist from
>    `packages/ui` after spec 018's dep drop. Lead with a version/risk table.
> 4. **Telemetry/conversion PM** — subagent `readiness-telemetry-conversion`. Area: confirm the
>    funnel events fire end-to-end to PostHog + Mixpanel (not just `memorySink`), the
>    seed→`/insights` pipeline works, the `profile-input` A/B flag resolves in prod, dashboards
>    exist and are populated, attribution is sound, and the live-vs-seeded story survives a
>    sceptical walkthrough (note `/insights` reads static JSON today; spec 023 proposes the live read).
> 5. **Release-QA engineer** — subagent `readiness-qa-engineer`. Area: confirm every workspace's
>    jest suite is green AND *meaningful* (the five-job `ci.yml` matrix: `@sorrel/domain`,
>    `@sorrel/shared`, `@sorrel/analytics`, `@sorrel/api`, `@sorrel/frontend` — asserts behaviour,
>    covers edge cases), determinism / flake risk (real `Date`/TZ/`Math.random`), the **missing
>    Cypress happy-path e2e** through the funnel (**CATS→PROFILE→RECIPES→DELIVERY→PLAN→EMAIL→
>    SUMMARY**) as the headline gap, coverage of the calendar (`DeliveryDatePicker.tsx`) + the
>    analytics event contract, a manual **pre-delivery smoke checklist** (each wizard step, the
>    calendar, locale switch `en`/`de`, the landing, `/insights`, the Storyblok draft preview),
>    that the perf evidence (mobile Lighthouse 95+) is current not stale, and whether the maintainer
>    can **run + extend the suite** from a clean clone.
>
> **Rules for every investigator:** read-only — no edits, no installs, no deploys. Each returns a
> **prioritized gap list** with severity (**blocker / major / minor**), a concrete fix, and the
> file + evidence. Cite real files and versions. See `tasks.md` for seed tasks.
>
> **Lead:** when all five report back, **merge into one severity-ranked pre-delivery checklist**.
> Deduplicate overlaps (e.g. missing `NEXT_PUBLIC_*` keys surface in both release and telemetry;
> the hoisted `@mui` in both release and deps; the analytics-contract test is QA's coverage but
> telemetry's fan-out; the Lighthouse number is QA's freshness but release's gate-hardness), group
> by severity, and for each item keep the maintainer-actionable fix + the file/evidence + which
> investigator found it. Keep QA's **manual smoke checklist** as its own pre-demo run-list. Present
> it as the single go/no-go list the maintainer works top-down before shipping.

---

## How the lead merges

- **One list, three severities.** Blockers first (would red CI, leak a secret, break a fresh
  clone, or make the demo empty/dishonest), then majors, then minors.
- **Deduplicate cross-cutting findings.** Keep one canonical item, note every investigator that
  flagged it.
- **Each item is maintainer-actionable:** severity · what · why it matters · the fix · file/evidence ·
  source investigator.
- **Keep the verify-against-live bucket separate** (telemetry's keys-on-Vercel / seed-run /
  dashboard-populated checks the code can't confirm) so the maintainer knows what to check manually.
- **Honour governance:** any fix that becomes real work needs an approved `specs/NNN-*.md` and a
  `Spec: NNN` commit trailer — the task force *finds* gaps; it doesn't self-approve the fixes.
