# Team 1 — `principal-review`

A standing **whole-project review board** for the Sorrel monorepo: five top-tier
reviewers who each take the entire project through one senior lens, challenge each
other, and let a lead synthesise a single prioritised report. This is the artifact a
senior engineering org would assemble to interrogate the codebase — architecture, frontend
craft, design fidelity, conversion instrumentation, and test engineering, all at once.

## Project quality bar (frame the synthesis around it)

Two project standards set the bar the synthesis should be measured against:

- **Pixel fidelity is a core project standard** — the build ships only when it _looks
  designed_, and **performance is judged down to paint/layout**: CLS, hydration cost, and
  layout/paint, not just a Lighthouse score. → the **designer** must judge against an
  _exact_ design match, not "close enough"; the **staff-frontend** must look at
  paint/layout/CLS/hydration cost, not just Lighthouse numbers; the **QA** absence of an
  e2e happy path reads as a demo that can break on a click.
- **The conversion thesis** is the other pole: the **39→65 funnel conversion** is the
  number the project exists to move. The codebase's convictions are **component-library /
  design-system reuse, the two-theme design-system discipline (Sorrel ships two brand
  themes), and preventing drift** — which is exactly what the App\* layer + two-theme
  picker answer. → the **architect** must assess two-theme reuse + theming + public-API
  discipline + drift prevention; the **conversion-analyst** maps every decision back to the
  funnel thesis.

The project also carries a coherent **AI workflow** (spec-gated governance) worth judging
on its own merits. → the **architect** should also judge whether that governance /
AI-workflow story is coherent and demo-ready, not just present. Keep the final report
legible: lead with the highest-severity, highest-blast-radius items first.

## Members (durable subagent defs in `.claude/agents/`)

| Teammate               | Subagent type                | Model  | Lens (whole project)                                                                                                                                                                                                                    |
| ---------------------- | ---------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Architect**          | `review-principal-architect` | opus   | Workspace boundaries, `schema.graphql`↔`packages/domain` source-of-truth integrity, GraphQL + codegen, App\* layering (spec 018), spec-gate governance soundness.                                                                       |
| **Staff FE**           | `review-staff-frontend`      | sonnet | React 19 / Next 16 App Router: RSC↔client boundaries, hooks (useActionState/useOptimistic/useEffect), Suspense/streaming, hydration, bundle, App\* component design.                                                                    |
| **Designer**           | `review-senior-designer`     | sonnet | Pixel-perfection vs the design handoff: tokens (spacing/type/radius/colour), wizard shell + 7 steps + delivery calendar, mobile-first responsive, hierarchy, brand.                                                                     |
| **Conversion analyst** | `review-conversion-analyst`  | opus   | The PM/telemetry lens: typed-event coverage, prop completeness/no-dupes, A/B validity, abandonment recovery, `/insights` honesty, the 39→65 thesis.                                                                                     |
| **QA engineer**        | `review-qa-engineer`         | sonnet | Test strategy + coverage across packages/{domain,shared,analytics}, services/api, apps/web; the deterministic-verification protocol; determinism/flake; the missing Cypress e2e (Tier-2 gap); do tests assert behaviour or just render. |

All five are **read-only** (`tools: Read, Glob, Grep, Bash` — no Edit/Write, no mutating
commands). They produce findings as `file:line — what — fix` with a P0/P1/P2 severity, and
hand off anything outside their lane to the owning reviewer rather than duplicating it.

## Prerequisite

Agent teams are experimental — the maintainer has already exported
`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. The runtime team config under
`~/.claude/teams/*/config.json` and the task files under `~/.claude/tasks/*/` are
auto-generated and ephemeral — **do not** author or commit them. The durable team is
exactly: these five `.claude/agents/*.md` defs, this brief, and `tasks.md`.

## How to spawn the team — paste this to a Claude Code lead

> Spin up the **principal-review** team to review the whole Sorrel repo against its
> thesis ("Conversion is an engineering discipline: instrument, find the step, fix the
> step, lock it with budgets") and ship me **one** prioritised report. Spawn five
> read-only teammates from their subagent defs and give each its opening assignment:
>
> - **architect** (`review-principal-architect`) — audit the monorepo boundaries and
>   contracts: every GraphQL op in `apps/web`/`services/api` against `schema.graphql`,
>   any pricing/portion/plan math leaking out of `packages/domain` into either framework
>   layer, the App\* layering + `sx`/`@mui` lint bans (spec 018), and whether the
>   `.claude/` spec-gate hooks actually make a wrong change un-mergeable.
> - **staff-frontend** (`review-staff-frontend`) — audit the `"use client"` frontier and
>   the hooks in `apps/web/app/[locale]/wizard/` (FunnelProvider, WizardChrome,
>   ProfileForm, EmailForm, useVariant, useExitIntent, useDraftAutosave, PlanForm): RSC vs
>   client correctness, effect deps/cleanup, useActionState/useOptimistic, hydration,
>   bundle, and the App\* component API.
> - **designer** (`review-senior-designer`) — audit fidelity vs the design handoff: token
>   usage from `packages/ui/src/theme/tokens.ts` + `src/app/tokens.ts`, the wizard shell
>   (mobile 420 card / desktop 1120 two-pane), the 7 steps, the delivery calendar, and the
>   landing/CMS bloks in both en + de. Use the handoff or a running build if I provide one;
>   otherwise review against tokens + specs and say which.
> - **conversion-analyst** (`review-conversion-analyst`) — audit the instrumentation:
>   build the step→event coverage matrix from the emit sites, validate the PROFILE A/B
>   (assignment in useVariant, variant capture on every relevant event, recoverable
>   abandonment), and judge whether `/insights` honestly reflects the funnel and backs the
>   39→65 claim.
> - **qa-reviewer** (`review-qa-engineer`) — audit the test suite as a product: read every
>   `*.test.ts(x)` across `packages/{domain,shared,analytics}`, `services/api`, and
>   `apps/web` and judge assertion quality (behaviour vs. no-throw), prove the **missing
>   Cypress/Playwright e2e** and the absent component-render tier by grep + `ci.yml`, check
>   determinism/flake against `.claude/rules/verification.md` + `verify-on-stop.sh`, and
>   spell out the single highest-value happy-path e2e the repo is missing. Run the suite
>   read-only to confirm it's green; map each gap to a concrete test to add.
>
> Rules of engagement: **read-only — no edits, no mutating commands.** Each teammate works
> its seed tasks from `.claude/agent-teams/principal-review/tasks.md`, reports findings as
> `file:line — what — severity — fix`, and **challenges the others** — if the architect
> calls a seam fine but the analyst sees it drop an event, surface the disagreement to me,
> don't paper over it. Hand cross-lane findings to the owning reviewer. When all five have
> reported, **you (the lead) synthesise a single de-duplicated, severity-ordered report**:
> P0s first with owner + fix, then P1/P2, then a one-line per-lens "verified clean" summary
> and the list of open disagreements. Scope to `git diff main...HEAD` if I name a branch;
> otherwise audit the whole repo.

## Lead synthesis contract

The lead does **not** add its own findings — it merges the five reports: collapse
duplicates (keep the owning lens's wording), order strictly by severity then blast radius,
attach every item to one owning reviewer, and preserve any reviewer-vs-reviewer
disagreement as an explicit "unresolved" line for the human to adjudicate. One report, no
per-agent walls of text.
