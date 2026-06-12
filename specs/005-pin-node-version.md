---
spec: 005
title: Pin the Node version (remove the --ignore-engines workaround)
status: approved
approved: yes
tier: 1
owner: repo root
---

# Problem / gap

The project's devDeps (eslint 10, etc.) require Node `^20.19 || ^22.13 || >=24`, but the
repo pins no version. A shell that defaults to Node 18 fails `yarn install`'s engine
check. Spec 001 installed deps with a one-off `--ignore-engines`; the proper fix is to
pin a supported Node so that flag is never needed (no suppression left behind).

# Scope

- `.nvmrc` — pin the dev Node line so `nvm use` selects a supported version.
- root `package.json` — declare `engines.node` matching what the deps actually support.
- `packages/ui/package.json` — fix the React deps: `@sorrel/ui` is a private internal package, so declare `react` as a regular dependency (single hoisted copy) and `@types/react` as a devDependency, instead of a peer that yarn-1 warns about in workspaces. The picker imports only `react`, so no `react-dom`. Clears the yarn install warning.

# Contract impact

None — tooling only.

# Out of scope

- CI configuration (a later spec adds GitHub Actions; it will read `.nvmrc`).

# Acceptance criteria

- [x] `.nvmrc` pins Node 24 (current active LTS)
- [x] `engines.node` declared on the root `package.json`, matching the dependency floor
- [x] `yarn install` succeeds on the pinned Node with no `--ignore-engines`
- [x] No spurious peer-dependency warning on `yarn install`
- [x] `yarn type-check` + domain tests stay green

# Analytics

None — tooling.
