---
paths:
  - "apps/web/**/*"
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
2. **The Domain Core (`packages/domain`):** All pricing rules, portion calculations, and plan invariants live *exclusively* inside this package. They must never be duplicated, rewritten, or logic-shared inside the Next.js application framework layer (`apps/web`).

## Component Skinning Protocol (packages/ui)
* When working on the delivery date picker centerpiece inside `packages/ui`, ensure the structural layout, keyboard navigation (roving tabindex, focus traps), and accessibility elements remain isolated from the two distinct token skins. One logic shell, two separate brand styles.
