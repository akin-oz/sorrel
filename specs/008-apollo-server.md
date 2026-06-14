---
spec: 008
title: Apollo Server — resolver types, schema mock, codegen wired
approved: yes
tier: 1
owner: services/api · codegen.ts
---

# Problem / gap

`schema.graphql` is agreed and guarded (spec 007), but nothing runs against it yet.
Two gaps remain before any funnel step can be wired end-to-end:

1. **Resolver types are ungenerated** — `codegen.ts` has an empty `generates: {}` with a
   comment that spec 008 wires the first target. Without generated resolver types the server
   is stringly-typed at the boundary, which breaks the "generated types are the only network
   types" contract from `.claude/rules/source-of-truth.md`.
2. **`yarn codegen` is absent** — the script was deliberately held back (codegen errors on an
   empty `generates`). Once the first target is wired, the script ships alongside it.
3. **`services/api` has no `src/`** — the workspace exists with `tsconfig.json` and
   `jest.config.ts` from the migration (spec 004) but nothing executes.

# Scope

## Codegen — wire the first target

Add one entry to `codegen.ts`:

```ts
"services/api/src/__generated__/resolvers.ts": {
  plugins: ["typescript", "typescript-resolvers"],
},
```

Install `@graphql-codegen/typescript-resolvers` (dev dep, flagged for approval). Add
`yarn codegen` to root `package.json` scripts:

```json
"codegen": "graphql-codegen --config codegen.ts"
```

Extend `yarn codegen:check` from pure schema validation to also run
`graphql-codegen --config codegen.ts --check` once the target is wired, so generated-type
drift fails the build.

## Apollo Server

Install `@apollo/server` and `graphql` (already present as a dev dep — promote to dep for
`services/api`). Wire a minimal Apollo Server in `services/api/src/index.ts`:

- Reads `schema.graphql` at start-up (same `readFileSync` pattern as `codegen-check.mjs`).
- Imports `Resolvers` from `__generated__/resolvers.ts` — the type-check enforces that
  every field is implemented.
- Starts on `localhost:4000` in development.

`services/api/package.json` — new workspace package `@sorrel/api`:

- `scripts: { dev, build, type-check, test }`
- deps: `@apollo/server`, `graphql`
- devDeps: none beyond what the root provides (ts-node, ts-jest, typescript already hoisted)

## Resolvers — stubbed, typed, complete

Every resolver in `Resolvers` must be implemented — no missing fields (the generated type
enforces this at compile time). For this spec, resolvers return realistic in-memory stubs:

| Query / Mutation   | Stub return                                                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `recipes`          | 3–4 in-memory `Recipe` objects                                                                                               |
| `deliveryEstimate` | derived from `packages/domain` `earliestDeliverableDate` + `BLOCKED_WEEKDAY_INDEXES`                                         |
| `plan`             | fixed stub `Pricing` + portion calc forwarded to `packages/domain` (if a `portionCalc` export exists; otherwise inline stub) |
| `funnelDraft`      | returns `null` (field is nullable in the schema)                                                                             |
| `dietaryPrograms`  | returns all three `DietaryProgram` values with `requiresVetConfirmation`                                                     |
| `saveFunnelDraft`  | stores draft in a module-level `Map`, returns it                                                                             |
| `updateFunnelPlan` | looks up draft by id, recomputes plan stub, returns updated draft                                                            |

`deliveryEstimate` is the one resolver that must call `packages/domain` — it is the
contract proof that the domain and schema are aligned.

## Domain link — `@sorrel/domain` as a dep of `@sorrel/api`

Add `"@sorrel/domain": "*"` to `services/api/package.json` dependencies.
Import `earliestDeliverableDate` and `BLOCKED_WEEKDAY_INDEXES` from `@sorrel/domain` in the
`deliveryEstimate` resolver. This is the first cross-package dep in `services/` and the
architectural proof that the domain layer is the canonical source of the delivery rules
(not a re-implementation in the resolver).

The `blockedWeekdays` field on `DeliveryEstimate` returns the schema's `Weekday` enum.
The domain uses Monday-first indexes (0=Mon … 6=Sun); the resolver maps indexes to enum
values — a thin translation layer, not a re-implementation of the rules.

## Resolver unit tests

`services/api/src/resolvers.test.ts` — resolver unit tests (node environment, no HTTP):

- `deliveryEstimate` returns an `earliest` date that is a non-blocked weekday and at least
  `DEFAULT_LEAD_DAYS` from today.
- `deliveryEstimate` `blockedWeekdays` matches the domain's `BLOCKED_WEEKDAY_INDEXES`
  (translated to enum values).
- `saveFunnelDraft` round-trips — save then retrieve via `funnelDraft`.
- `dietaryPrograms` marks `RENAL_SUPPORT` and `PLANT_BASED` as `requiresVetConfirmation: true`.

Wire `ts-jest` transform in `services/api/jest.config.ts` (pattern already set; add the
transform matching `packages/domain/jest.config.ts`).

# Contract impact

None — the schema does not change. This spec generates types _from_ the schema and
implements resolvers _against_ those types.

# Out of scope

- HTTP layer beyond Apollo's built-in standalone server — no Express wrapper, no auth, no
  middleware. That is Tier-2.
- Subscriptions — not in the schema.
- Persisted drafts (database) — stubs only; real persistence is its own spec.
- `apps/web` wiring (Apollo Client, codegen operation types) — the wizard spec.
- CI contract check — Tier-2 GitHub Actions; `yarn codegen:check` is the local guard.

# New dependencies (flagged for approval)

| Package                                 | Type                 | Version | Reason                        |
| --------------------------------------- | -------------------- | ------- | ----------------------------- |
| `@graphql-codegen/typescript-resolvers` | devDep (root)        | `^4.x`  | codegen resolver types plugin |
| `@apollo/server`                        | dep (`services/api`) | `^4.x`  | the server itself             |

`graphql` is already in root devDeps; it becomes a peer dep of `@apollo/server` — no new
install needed.

# Acceptance criteria

- [ ] `yarn codegen` runs and emits `services/api/src/__generated__/resolvers.ts`
- [ ] `yarn codegen:check` fails if generated types drift from the schema
- [ ] `yarn type-check` green — `Resolvers` type forces every field to be implemented
- [ ] `services/api` dev server starts (`yarn workspace @sorrel/api dev`) and responds to
      an introspection query
- [ ] `deliveryEstimate` resolver calls `@sorrel/domain` — no duplicate logic
- [ ] Resolver unit tests pass (`yarn workspace @sorrel/api test`)
- [ ] No hand-written network types anywhere in `services/api` (all from `__generated__`)
- [ ] No real-brand names, logos, copy, or assets

# Analytics

None — backend infrastructure.
