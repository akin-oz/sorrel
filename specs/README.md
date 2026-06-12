# Specs — the spec-gated execution ledger

> "I do not prevent the model from being wrong, I make wrong un-mergeable."

Every feature begins life here as `NNN-name.md`. The agent may **only** implement
specs whose front-matter says `approved: yes`. This directory is the contract
between the human and the agent, and the git log is the demo: spec → approval →
implementation → green checks → merge.

## Lifecycle
1. **Propose** — `/spec-new <gap>` (or the `spec-author` agent) writes `NNN-name.md`
   with `approved: no`. Nothing is built yet.
2. **Approve** — a human reviews and flips the front-matter to `approved: yes`.
   This is the only step the agent never performs.
3. **Implement** — the agent builds strictly within the approved scope.
4. **Commit** — every commit carries a `Spec: NNN` trailer (enforced by
   `.claude/hooks/guard-commit.sh`).

## Numbering
Zero-padded, monotonically increasing: `001`, `002`, … Use `_template.md` as the
starting point. `tier` follows the architecture tiers (1 credible core, 2 JD
coverage, 3 closers).

## How this is enforced
- `.claude/rules/no-invention.md` — no endpoints/props/deps/UI states outside an approved spec.
- `.claude/rules/source-of-truth.md` — `schema.graphql` + `packages/domain` are canonical.
- `.claude/rules/verification.md` — green typecheck + tests in-turn; "should work" is banned.
- `.claude/hooks/guard-source-of-truth.sh` — pauses for human approval on contract files.
- `.claude/hooks/guard-commit.sh` — requires the `Spec: NNN` trailer.
- `.claude/hooks/verify-on-stop.sh` — fails the turn if the tree is not green.
