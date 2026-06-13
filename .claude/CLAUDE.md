# Sorrel Monorepo: Claude Operational Guide

> "I do not prevent the model from being wrong, I make wrong un-mergeable."
> **Thesis:** Conversion is an engineering discipline: instrument, find the step, fix the step, lock it with budgets.

---

## 🛠 Operational Commands

### Development & Validation

- **Type-check entire codebase:** `yarn type-check` (Must pass with 0 warnings/errors)
- **Lint entire codebase:** `yarn lint`
- **Auto-fix linting issues:** `yarn lint:fix`
- **Run unit tests:** `yarn workspace @sorrel/domain test`

### Monorepo Architecture Reference

- `apps/web`: Next.js App Router, React, Strict TS, MUI.
- `services/api`: Apollo Server: recipes, pricing, plans, mutations.
- `packages/ui`: Delivery date picker & shared components (two token themes).
- `packages/domain`: Pricing rules, portion calculation, plan invariants, unit tests.
- `packages/analytics`: Typed funnel event contract shared by web and seed scripts.

---

## 🤖 AI Governance & Execution Layer

You are operating under a strict **Spec-Gated Execution** protocol.

### 1. Spec Gating Protocol

- You may **only** implement features that exist as approved specification files under `specs/NNN-*.md` containing `approved: yes` in the front-matter.
- Every single git commit you generate must include the `Spec: NNN` trailer referencing the approved specification document.

### 2. Execution Constraints

- **No Branding Infringement:** This is a fictional cat food brand. Absolutely no references to real-world competitor names, logos, copy, or assets.
- **Ship Only Complete:** A half-built funnel step or component is worse than no code. Every turn must leave the codebase completely unbroken.
