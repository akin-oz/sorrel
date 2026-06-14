---
spec: 007
title: GraphQL schema — the contract (schema-first, per-consumer codegen, drift guard)
approved: yes
tier: 1
owner: schema.graphql
---

# Problem / gap

Contract-first is the project's thesis ("I make wrong un-mergeable") and the author's
signature: _agree the shape once, generate types, mock, guard in CI — contracts are the new
firewall._ Yet `schema.graphql` does not exist: `.claude/rules/source-of-truth.md` and the
`contract-guardian` agent both reference it as canonical, but there is nothing to enforce.
This spec lays the spine **before** the wizard UI (reprioritized per direction): agree the
shape, then guard it.

# Scope

- **`schema.graphql`** (repo root) — the single source of truth for the funnel contract (SDL
  below). The PreToolUse guard already protects this path.
- **Codegen tooling** — `@graphql-codegen/cli` + `@graphql-codegen/typescript` (dev deps;
  flagged here for approval — no stealth deps) and a `codegen.ts` config.
- **Per-consumer generation — no shared types package.** `codegen.ts` is structured to emit,
  from this one schema:
  - resolver types into `services/api` (wired in with the Apollo server, spec 008),
  - operation / typed-document types into `apps/web` (wired in with the wizard's queries).
    The single source of truth is the `.graphql` file, not a TS package. Client and server need
    different generated artifacts (operation types vs. resolver types), so there is **no
    `@sorrel/graphql` package**. If a base enum/input ever needs to be authored once and shared,
    it goes in `@sorrel/shared` (already in the path aliases) — but generated code stays with
    its consumer.
- **Scripts** — `yarn codegen` (regenerate all configured consumer outputs) and
  `yarn codegen:check` (regenerate + fail on any diff — the drift guard). Until a consumer
  wires an output, `codegen:check` validates that `schema.graphql` parses to a valid schema.

# Proposed contract (review me — this is the artifact)

Descriptions (`"..."`) are part of the contract — introspectable, shown in API explorers and
IDE hovers, and emitted as TSDoc by codegen. Anything a consumer needs to use a field
correctly is a description, not a `#` comment.

```graphql
"An ISO-8601 calendar date: YYYY-MM-DD (no time, no timezone)."
scalar Date

"An ISO-8601 timestamp with timezone, e.g. 2026-06-12T11:35:50Z."
scalar DateTime

enum Currency {
  GBP
}

"A monetary amount in minor units (pence) — never a float, to avoid rounding drift."
type Money {
  "Amount in the currency's minor unit; 2408 means £24.08."
  amountMinor: Int!
  currency: Currency!
  "Display string including the currency symbol, e.g. £24.08."
  formatted: String!
}

enum Fussiness {
  EATS_ANYTHING
  SELECTIVE
  VERY_FUSSY
}
enum BoxFrequency {
  EVERY_2_WEEKS
  EVERY_4_WEEKS
}
enum Allergen {
  CHICKEN
  FISH
  GRAIN
  DAIRY
  CHICKPEA
}
enum DietaryTag {
  GRAIN_FREE
  CHICKEN_FREE
  SENSITIVE
}
"Structured feeding regimes, distinct from DietaryTag (marketing filters) and Allergen (exclusions)."
enum DietaryProgram {
  NOVEL_PROTEIN
  RENAL_SUPPORT
  PLANT_BASED
}

type DietaryProgramInfo {
  program: DietaryProgram!
  name: String!
  "True for clinical programs (RENAL_SUPPORT, PLANT_BASED): selecting one requires confirmed veterinary supervision. The domain layer rejects unconfirmed selections."
  requiresVetConfirmation: Boolean!
  description: String!
}

"The seven wizard steps, in funnel order."
enum FunnelStep {
  CATS
  PROFILE
  RECIPES
  DELIVERY
  PLAN
  EMAIL
  SUMMARY
}

type Cat {
  id: ID!
  name: String!
  "Age in whole months."
  ageMonths: Int!
  neutered: Boolean!
  "Body weight in kilograms."
  weightKg: Float!
  fussiness: Fussiness!
  allergies: [Allergen!]!
  "Structured feeding regime, if any. Most cats have none."
  dietaryProgram: DietaryProgram
  vetConfirmed: Boolean!
}
input CatInput {
  name: String!
  "Age in whole months."
  ageMonths: Int!
  neutered: Boolean!
  "Body weight in kilograms."
  weightKg: Float!
  fussiness: Fussiness!
  allergies: [Allergen!]! = []
  dietaryProgram: DietaryProgram
  "Must be true when dietaryProgram requires veterinary confirmation: enforced in packages/domain, asserted in tests."
  vetConfirmationAcknowledged: Boolean! = false
}

type Recipe {
  id: ID!
  "Stable identifier referenced by recipeSlugs across the funnel, e.g. wild-caught-salmon."
  slug: String!
  name: String!
  description: String!
  dietaryTags: [DietaryTag!]!
  imageUrl: String
  available: Boolean!
  "Programs this recipe is formulated for. Empty for standard recipes."
  suitablePrograms: [DietaryProgram!]!
}
input RecipeFilter {
  dietaryTags: [DietaryTag!]
  excludeAllergens: [Allergen!]
  program: DietaryProgram
}

enum Weekday {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY
}

"The delivery availability the picker renders — mirrors the packages/domain rules."
type DeliveryEstimate {
  "Earliest deliverable date; the picker pre-selects this."
  earliest: Date!
  "Weekdays on which delivery never runs."
  blockedWeekdays: [Weekday!]!
  "Minimum days from today before the earliest deliverable date."
  leadDays: Int!
}

type Pricing {
  perDay: Money!
  perBox: Money!
  firstBox: Money!
}
type Plan {
  frequency: BoxFrequency!
  "Daily food portion in grams (from the packages/domain portion calc)."
  portionGramsPerDay: Int!
  mealsPerBox: Int!
  pricing: Pricing!
}
input PlanInput {
  cats: [CatInput!]!
  recipeSlugs: [String!]!
  frequency: BoxFrequency!
}

"Persisted funnel state for abandonment recovery (resume mid-funnel)."
type FunnelDraft {
  id: ID!
  step: FunnelStep!
  cats: [Cat!]!
  recipeSlugs: [String!]!
  deliveryDate: Date
  frequency: BoxFrequency
  email: String
  "When the draft was last saved."
  updatedAt: DateTime!
}
input SaveFunnelDraftInput {
  "Existing draft id to update; omit to create a new draft."
  id: ID
  step: FunnelStep!
  cats: [CatInput!]
  recipeSlugs: [String!]
  deliveryDate: Date
  frequency: BoxFrequency
  email: String
}

type Query {
  recipes(filter: RecipeFilter): [Recipe!]!
  "Earliest delivery date + blocked weekdays for the picker."
  deliveryEstimate("Optional postcode to refine availability." postcode: String): DeliveryEstimate!
  plan(input: PlanInput!): Plan!
  funnelDraft(id: ID!): FunnelDraft
  "Program catalog, including which programs carry the veterinary gate."
  dietaryPrograms: [DietaryProgramInfo!]!
}

type Mutation {
  "Autosave for abandonment recovery — driven optimistically from the client."
  saveFunnelDraft(input: SaveFunnelDraftInput!): FunnelDraft!
  "Recompute plan + price on frequency/recipe change (optimistic preview)."
  updateFunnelPlan(draftId: ID!, input: PlanInput!): FunnelDraft!
}
```

# Contract impact

This **creates** the contract. Per `.claude/rules/source-of-truth.md`, `schema.graphql` +
`packages/domain` become canonical; generated types are the only network types. `Money` as
minor units (not float) matches the domain's no-rounding-drift rule. `DeliveryEstimate`
mirrors the picker rules already unit-tested in `packages/domain`.

# Out of scope (own follow-up specs)

- Apollo Server + resolvers + schema mocking, and the **resolver-type** codegen output —
  spec 008.
- The wizard's client operations and the **operation-type** codegen output — the wizard spec.
- CI contract check (the `guard in CI` step) — Tier-2 GitHub Actions; this spec ships the
  local `codegen:check` / validity guard that CI will mirror.

# Acceptance criteria

- [ ] `schema.graphql` validates and models all seven funnel steps
- [ ] `codegen.ts` + `yarn codegen` / `yarn codegen:check` present; `codegen:check` fails on
      an invalid schema (and on generated-type drift once a consumer wires an output)
- [ ] No standalone `@sorrel/graphql` package; no hand-written network types in the repo
- [ ] `yarn type-check` and the 25 domain tests stay green
- [ ] No real-brand names, logos, copy, or assets

# Analytics

None — funnel events live in `packages/analytics` (a typed event contract, separate from the
GraphQL contract).
