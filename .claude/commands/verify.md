---
description: Run the full deterministic-verification gate and report results (no claims without proof).
allowed-tools: Bash(yarn type-check:*), Bash(yarn lint:*), Bash(yarn workspace:*), Bash(yarn format:check:*)
---

Run the verification gate and report exact results. Per `.claude/rules/verification.md`,
make no behavior claims without green output in this turn.

1. `yarn type-check` — must be 0 errors / 0 warnings.
2. `yarn format:check` — formatting must be clean.
3. If `packages/domain` exposes a `test` script: `yarn workspace <domain-pkg> test`.

Report a short table: each command → pass/fail → the failing tail if red.
If anything is red, state plainly that the work is NOT complete and what to fix.
Do not say "should work".
