---
spec: NNN
title: <short imperative title>
status: proposed
approved: no # ONLY a human flips this to yes — implementation is gated on it
tier: 1 # 1 credible core · 2 JD coverage · 3 closers
owner: <area, e.g. apps/web · packages/ui · packages/domain>
---

# Problem / gap

<What is missing, and why no existing approved spec covers it.>

# Scope

<The exact files, components, schema types, and analytics events this touches. Name them.>

# Contract impact

<Does this change `schema.graphql` or `packages/domain`? Describe the additive change
and the generated-type consequence. If none, say "none".>

# Out of scope

<What this spec deliberately excludes — the guard against scope creep.>

# Acceptance criteria

- [ ] `yarn type-check` green (0 errors/warnings)
- [ ] Unit tests added where logic changed (domain / date logic)
- [ ] Required funnel events fire with correct props
- [ ] Accessibility checklist met (for UI work)

# Analytics

<Which typed events fire (`funnel_step_viewed`, `step_completed`, `field_error`,
`funnel_abandoned`) and their props (`step`, `variant`, `error`).>
