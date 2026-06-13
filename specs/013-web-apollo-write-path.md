---
spec: 013
title: Web Apollo write-path — pricing in the domain, FunnelDraft.plan, optimistic mutations
status: proposed
approved: yes
tier: 1
owner: apps/web · services/api · packages/domain · schema.graphql · .claude
---

# Problem / gap

The headline technical gap: `apps/web` consumes **zero** GraphQL — the wizard is 100%
localStorage, no `@apollo/client`, no `useMutation`/`useSuspenseQuery`. The schema is a
fully-specified funnel backend the web app never calls. Three coupled defects block the
optimistic price-preview the funnel is meant to show:

1. **Pricing logic is in the wrong package** — `computePlan`/`stubMoney` are inline in
   `services/api/resolvers.ts`, while `.claude/rules/source-of-truth.md` + the schema comment
   ("from the packages/domain portion calc") declare `packages/domain` canonical. A
   source-of-truth violation.
2. **`updateFunnelPlan` can't return a price** — the resolver never recomputes, drops `cats`,
   and `FunnelDraft` carries **no pricing field** (`schema.graphql`), so the cache-update
   mutation has nothing real to update.
3. **No web Apollo client** — nothing to wire the optimistic response / cache update into.

> The connecting insight: move pricing into `packages/domain` and you fix the source-of-truth
> violation, the dead `updateFunnelPlan`, AND the missing prerequisite for the optimistic
> preview — one change, three payoffs. Adding `FunnelDraft.plan` gives the cache update
> something to update.

# Scope

## Domain — pricing becomes canonical
- New `packages/domain/src/pricing/` — move `computePlan` + money helpers out of the resolver;
  unit-test portion calc + plan invariants (mirrors the calendar tests' rigor).
- `services/api` imports pricing from `@sorrel/domain` (no inline logic).

## Guardrail — keep domain logic in the domain (anti-drift)

Pricing landed in `services/api` in the first place because the source-of-truth rule named only
`apps/web`, and **nothing enforced it**. This spec closes that hole so the move can't silently
reverse:

- **Rule** — tighten `.claude/rules/source-of-truth.md`: pricing, portion calc, and plan
  invariants live **only** in `packages/domain`; `services/api` and `apps/web` import them and
  never inline them (today the rule calls out only `apps/web`).
- **Hook** — `.claude/hooks/guard-domain-logic.sh` (PreToolUse `Edit|Write`, wired in
  `.claude/settings.json`): when a write targets `services/api/src/**` or `apps/web/**` (never
  `packages/domain`), scan the new content for domain-logic signatures — money arithmetic on
  `amountMinor`, `computePlan` / `computePrice` / `portion*` identifiers, plan-invariant math —
  and return `permissionDecision: "ask"` that points the edit at `packages/domain`. Drift
  becomes a conscious, logged decision instead of an accident.
- The `contract-guardian` agent already flags this on demand; the hook makes it automatic, so a
  future session (human or model) can't reintroduce the same violation unnoticed.

## Contract — `FunnelDraft.plan` + a working mutation
- Add `plan: Plan` to `FunnelDraft` in `schema.graphql`; re-run `yarn codegen` (resolver types).
- `updateFunnelPlan` recomputes the plan from `cats` + `recipeSlugs` + `frequency` via the
  domain, returns the updated draft incl. `plan`.

## Web Apollo client (RSC-safe)
- `@apollo/client` + `@apollo/client-integration-nextjs` (`registerApolloClient` for a
  per-request RSC client — no cross-user cache bleed) + a client-side provider for islands.
- `codegen.ts` gains the **`apps/web` client-preset target** (typed documents) — closes the
  hand-written-enum gap (FunnelStep/DietaryTag generated, sync-guard tests retired).

## Two mutations on the funnel
- `saveFunnelDraft` — `optimisticResponse` + `cache.modify` autosave (abandonment recovery now
  truly server-backed, fulfilling the README "resume" claim).
- `updateFunnelPlan` on the PLAN step — frequency toggle drives a React 19 `useOptimistic`
  price preview that re-renders before the mutation resolves; the "updating" chip is the
  in-flight affordance (matches the design).

## EMAIL step (server action)
- `useActionState` + a server action with server-side validation — the `field_error` emit and
  the "server actions vs Apollo mutations" talking point.

# Contract impact

**Additive schema change** (`FunnelDraft.plan`) → regenerated resolver + operation types. Pricing
moves **into** `packages/domain` (the canonical home) — not duplicated. No breaking field changes.

# Out of scope (own specs)
- The A/B variant wiring + seed/insights — spec 014.
- CI mirror of codegen drift — spec 015.

# New dependencies (flagged for approval)
| Package | Type | Reason |
|---|---|---|
| `@apollo/client` | dep (`apps/web`) | the GraphQL client |
| `@apollo/client-integration-nextjs` | dep (`apps/web`) | RSC `registerApolloClient` |
| `@graphql-codegen/client-preset` | devDep (root) | typed documents for `apps/web` |

# Acceptance criteria
- [ ] `computePlan` lives in `packages/domain` with unit tests; the resolver imports it (no inline pricing)
- [ ] Anti-drift guardrail in place: tightened `source-of-truth.md` + a `guard-domain-logic`
      PreToolUse hook that flags pricing/plan logic written outside `packages/domain`
- [ ] `FunnelDraft.plan` in the schema; `updateFunnelPlan` returns a recomputed plan; `codegen:check` green
- [ ] `apps/web` has an RSC Apollo client + the client-preset codegen target; no hand-written network types
- [ ] PLAN frequency toggle shows a `useOptimistic` price preview before the mutation resolves
- [ ] `saveFunnelDraft` autosaves with optimistic response + cache update
- [ ] EMAIL uses `useActionState` + a server action with server-side validation
- [ ] `yarn type-check` + `yarn lint` clean; existing tests stay green; `next build` green
- [ ] No real-brand names/assets

# Analytics
EMAIL validation failures fire `field_error` (step, field, error) via the spec-009 contract.
