---
spec: 004
title: Complete the monorepo migration (remove the root Next starter)
approved: yes
tier: 1
owner: repo root
---

# Problem / gap

The repo began as a single Create-Next-App at the root and is being converted to a
yarn-workspaces monorepo. The new workspaces (`apps/web`, `packages/*`, `services/*`) and
the governance layer are committed, but the OLD root-level starter (`app/`,
`next.config.ts`, root `CLAUDE.md`, `public/*`) and the root config rewiring were left
uncommitted — so `main` currently carries both layouts. This finishes the cut.

# Scope

- Remove the root Next starter: `app/`, root `next.config.ts`, root `CLAUDE.md`, `public/*`.
- Commit the root config rewiring for the monorepo: `package.json` (workspaces),
  `tsconfig.json`, `eslint.config.mjs`, `.gitignore`, `AGENTS.md`, `yarn.lock`.

# Contract impact

None — structural migration only. No `schema.graphql` or domain-logic changes.

# Out of scope

- Implementing any wizard step or workspace feature (each is its own spec).

# Acceptance criteria

- [x] No root-level Next starter remains on `main` (`apps/web` is the only Next app)
- [x] `yarn type-check` green
- [x] Working tree clean after the commit

# Analytics

None — structural.
