---
paths:
  - "apps/web/**/*"
  - "services/api/**/*"
  - "packages/ui/**/*"
  - "packages/domain/**/*"
  - "packages/analytics/**/*"
  - "schema.graphql"
---

# Rule: Enforcement of the Source of Truth

## Context

The monorepo operates via hard contracts. Code generation and core business invariants dictate the architecture, preventing application components from inventing separate data rules.

## The Two Anchors

1. **The API Contract (`schema.graphql`):** The GraphQL schema is the single source of truth for data flow. Frontend actions, hooks, and types must be natively generated from this schema. Do not write manual data types for network operations.
2. **The Domain Core (`packages/domain`):** All pricing rules, portion calculations, and plan invariants live _exclusively_ inside this package. They must never be duplicated, rewritten, or logic-shared into **either** framework layer — neither the API server (`services/api`) nor the Next.js app (`apps/web`). Both layers import these from `@sorrel/domain` and map them onto the GraphQL enums at their boundary; they never re-implement the maths. (The earlier wording named only `apps/web`, which is how `computePlan` + money helpers once drifted into `services/api`.) This is enforced two ways: `guard-source-of-truth.sh` asks before any edit _to_ `packages/domain`, and `guard-domain-logic.sh` asks when domain-logic signatures — money arithmetic on `amountMinor`, the meals-per-box rule, portion-from-weight calc, or a pricing/portion helper definition — appear in a write _to_ `services/api/src/**` or `apps/web/**`. The `contract-guardian` agent flags the same on demand.

## Component Skinning Protocol (packages/ui)

- When working on the delivery date picker centerpiece inside `packages/ui`, ensure the structural layout, keyboard navigation (roving tabindex, focus traps), and accessibility elements remain isolated from the two distinct token skins. One logic shell, two separate brand styles.
