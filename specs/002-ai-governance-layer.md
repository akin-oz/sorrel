---
spec: 002
title: AI governance & execution layer (.claude hooks, agents, commands)
status: approved
approved: yes
tier: 1
owner: .claude
---

# Problem / gap

The repo is meant to be the AI-workflow exhibit ("the git log is the demo"). It
needs the enforcement layer that makes the thesis true — _I do not prevent the
model from being wrong, I make wrong un-mergeable_ — wired as hooks/agents/commands,
not prose. Without this, the rules in `.claude/rules/` are advisory only.

# Scope

- `.claude/settings.json` — wires the hooks.
- `.claude/hooks/` — `guard-source-of-truth.sh`, `guard-commit.sh`, `lint-on-edit.sh`,
  `verify-on-stop.sh`, `preserve-context.sh`, `session-start.sh`.
- `.claude/agents/` — `spec-author`, `contract-guardian`, `funnel-reviewer`,
  `a11y-reviewer`, `test-author`.
- `.claude/commands/` — `/spec-new`, `/spec-review`, `/verify`.
- `specs/` — `_template.md`, `README.md`, and this ledger.

# Contract impact

None. This layer does not touch `schema.graphql` or `packages/domain`; it enforces
that nothing else does so without an approved spec.

# Out of scope

- CI mirroring of the hooks (GitHub Actions spec-gate + Lighthouse budget) — a later spec.
- `docs/ai-workflow.md` narrative — a later spec.

# Acceptance criteria

- [x] `yarn type-check` green (verified: exit 0)
- [x] Hooks syntax-checked and behavior-tested (14/14 checks pass)
- [x] `guard-commit.sh` blocks commits missing a `Spec: NNN` trailer
- [x] `verify-on-stop.sh` is defensive: skips when `node_modules` is absent
- [x] No real-brand names, logos, copy, or assets

# Analytics

None — this spec ships tooling, not a funnel step.
