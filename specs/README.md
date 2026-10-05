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
   `.claude/hooks/guard-git.mjs`).

## Numbering

Zero-padded, monotonically increasing: `001`, `002`, … Use `_template.md` as the
starting point. `tier` follows the architecture tiers (1 credible core, 2 JD
coverage, 3 closers).

## How this is enforced

- `.claude/rules/no-invention.md` — no endpoints/props/deps/UI states outside an approved spec.
- `.claude/rules/source-of-truth.md` — `schema.graphql` + `packages/domain` are canonical.
- `.claude/rules/verification.md` — green typecheck + tests in-turn; "should work" is banned.
- `.claude/hooks/guard-source-of-truth.sh` — pauses for human approval on contract files.
- `.claude/hooks/guard-git.mjs` — tokenises every Bash command: requires the `Spec: NNN` trailer; refuses `--no-verify`/`-n`, `core.hooksPath` overrides, `.env*` staging, and any `git push`/`git reset` (spec 057, tested by `scripts/governance/guard-git.test.mjs`).
- `.github/workflows/spec-gate.yml` → `scripts/governance/spec-gate.sh` — the CI authority (spec 059):
  every PR commit needs a `Spec: NNN` trailer citing a spec that is **already approved on `main`**.
  Spec-only commits (drafts, approval flips) are exempt, so approvals merge to `main` first,
  then the implementation PR. Runs from `main`'s copy via `pull_request_target`; proven by
  `scripts/governance/spec-gate.test.mjs`.
- `.claude/hooks/verify-on-stop.sh` — fails the turn if the tree is not green.

## Governance layers (specs 056–060)

Each layer catches what the one above it misses. CI is the authority; the local
layers make mistakes fast and cheap to catch.

| Layer                       | Enforces                                                                                                                                                                                    | Runs where                                        | Residual risk                                                                                                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Permission deny rules (056) | No `Read`/`cat` of `.env*` (except `.env.example`), `*.pem`, `~/.ssh`, `~/.aws`; no `git push`/`git reset`                                                                                  | Claude Code, before each tool call                | Matches command text only; `git -C . push` or a script reading a file is not matched                                                                                                                                             |
| Bash sandbox (056)          | OS-level: those same files unreadable at any depth; writes only in the repo + temp; network only to `registry.yarnpkg.com`; no unsandboxed retry; refuses to run if the sandbox can't start | macOS Seatbelt, per Bash command                  | Hooks, MCP servers and `!` commands run outside it. With permissions bypassed, unlisted hosts are allowed unless `strictAllowlist` is set in **user** settings. A cold `yarn install` fails inside it, so installs are human-run |
| Git guard (057)             | `Spec: NNN` trailer in the parsed message; no `--no-verify`/`-n`, `core.hooksPath` override, `.env*` staging, push or reset — through `-C`/`-c`, wrappers, `sh -c`, aliases                 | PreToolUse hook, outside the sandbox              | Sees command text only; git run by a script is invisible to it                                                                                                                                                                   |
| Spec gate (059)             | Every PR commit cites a spec approved **on `main`**; self-approval and body mentions rejected                                                                                               | GitHub Actions, `pull_request_target` from `main` | Advisory until branch protection makes it required; merge commits are not checked                                                                                                                                                |
| Branch protection (059)     | Required checks: spec gate, CI `Verify`, `Governance tests`; applies to admins                                                                                                              | GitHub                                            | Applied by the human (command in spec 059)                                                                                                                                                                                       |
| Settings hygiene (058)      | Only listed `.mcp.json` servers start; no stale permanent allows                                                                                                                            | Local `settings.local.json`                       | Local to one machine                                                                                                                                                                                                             |

**Agent-team teammates (060).** The docs say teammates load the same project
context (CLAUDE.md, MCP servers, skills) and start in the lead's permission mode.
A bypassed lead means bypassed teammates. The sandbox docs cover subagents (same
process, same sandbox) but say nothing about split-pane (tmux) teammates.
**Empirical check: pending a human run.** It cannot be driven from a sandboxed
session (tmux's socket directory is write-denied, and a nested sandbox can't
start). The 3-minute checklist is in spec 060. Until it passes, assume tmux
teammates may be less contained than the lead. The fallback is
`teammateMode: "in-process"`.

**Pending:** wire `aie audit` into the `governance` CI job once the compiler
ships it. On 2026-10-05 no `aie` exists in the repo or on `PATH`.

All governance tests: `node --test 'scripts/governance/*.test.mjs'`.
