---
spec: 057
title: Rewrite the git commit guard with real tokenising, and prove it with adversarial tests
status: accepted
approved: yes # ONLY a human flips this to yes — implementation is gated on it
tier: 1 # governance core — the local half of "wrong is un-mergeable"
owner: .claude/hooks · scripts/governance · .github/workflows/ci.yml
---

# Problem / gap

`.claude/hooks/guard-commit.sh` decides with the regex `git[[:space:]]+(add|commit)`. Every
invocation that puts anything between `git` and the subcommand skips all three checks
(Spec trailer, `--no-verify`, `.env*`):

- `git -C . commit -m x`: no trailer, and allowed. Its `-C` also trips the "reuse message"
  early `exit 0`.
- `git -c a=b commit -m x`, `/usr/bin/git commit`, `sh -c "git commit …"`, `env git commit`
- `git commit -nm x`: combined short flags are not seen as `-n`.
- A git alias (`git ci`) is never expanded.
- The trailer check greps the whole command, so `echo "Spec: 001"; git commit -m x` passes.

Nothing tests the guard, so the hole sat open without anyone noticing.

# Scope

## A — Red tests first (commit 1)

`scripts/governance/guard-git.test.mjs` uses `node:test` and `node:assert` only, with no
dependencies. It reads the `PreToolUse` → `Bash` hook commands from `.claude/settings.json`,
so it always tests **what is wired**. It feeds each case as hook JSON
(`{"tool_name":"Bash","tool_input":{"command":…}}`) on stdin and asserts the exit code.

Must exit **2** (deny):

| #   | Command                                                                                                                                                                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `git -C . commit -m x`                                                                                                                                                                                                                                            |
| 2   | `git -c a=b commit -m x`                                                                                                                                                                                                                                          |
| 3   | `/usr/bin/git commit -m x`                                                                                                                                                                                                                                        |
| 4   | `git add .env`                                                                                                                                                                                                                                                    |
| 5   | `git commit -n -m "x" -m "Spec: 056"`                                                                                                                                                                                                                             |
| 6   | `git commit --no-verify -m "x" -m "Spec: 056"`                                                                                                                                                                                                                    |
| 7   | `git commit -m "docs: explain --no-verify" -m "Spec: 056"` (any mention is refused, deliberately conservative)                                                                                                                                                    |
| 8   | `git commit -m "feat: x"` (missing trailer)                                                                                                                                                                                                                       |
| 9+  | `git commit -nm x`, `sh -c 'git commit -m x'`, `env git commit -m x`, `echo "Spec: 056"; git commit -m x`, `git -c core.hooksPath=/dev/null commit …`, `git -C . push`, `git push --force`, `git push origin +main`, `git -C . reset --hard`, alias `ci = commit` |

Must exit **0** (allow): `git status`, `git commit -m "feat: x" -m "Spec: 056"`, the heredoc
`-F - <<EOF … Spec: 056 … EOF` form this repo uses, `git add .env.example`,
`git commit --amend --no-edit`, and `echo git commit` (not an invocation).

The test prints one line per case (`exit=2 ✓ git -C . commit -m x`) so the output is the evidence.
Against today's guard, cases 1–3 and most of 9+ fail. That red commit is the "before" proof.

## B — The guard (commit 2)

`.claude/hooks/guard-git.mjs` replaces `guard-commit.sh`. It is dependency-free Node ESM and
`settings.json` switches its hook command. It works like this:

1. **Tokenise** the command with a quote-aware lexer (`'…'`, `"…"`, `\`). It splits on
   `;`, `&&`, `||`, `|`, `&` and newlines, recurses into `$(…)` and backticks, and keeps
   heredoc bodies as data.
2. **Unwrap** leading `VAR=x`, `env [opts]`, `command`, `builtin`, `exec`, `nohup`, `time`,
   `timeout N`, `nice`, `sudo` and `xargs`. `sh|bash|zsh -c <str>` and `eval` are re-parsed.
3. **Find git**: the token's basename is `git`. Skip the global options: `-C <p>`, `-c <k=v>`,
   `--git-dir`, `--work-tree`, `--namespace`, `--exec-path`, `--config-env`, `-p`, `-P`,
   `--no-pager`, `--bare` and `--literal-pathspecs`. Expand an alias with
   `git config --get alias.<sub>`. A `!`-alias is re-parsed as shell.
4. **Deny (exit 2, with the reason on stderr):**
   - `push` in any form, and `reset` in any form (pairs with spec 056).
   - `commit` with `-n` or `--no-verify`, including inside combined short flags. Flags that
     take a value (`-m`, `-F`, `-C`, `-c`, `-t`) end the cluster.
   - Any command that contains `--no-verify` alongside a git invocation (case 7).
   - `-c core.hooksPath=…` / `--config-env` on any git call, because it disables native hooks.
   - `add` or `commit` naming a `.env*` path that is not `.env.example|sample|template`.
   - `commit` whose **parsed message** has no `^Spec:\s*\d{3}$` line. The message is read from
     every `-m`/`--message`, from `-F <file>` (the file is read), or from `-F -` (the heredoc
     body). `--amend --no-edit` and `-C/-c <rev>` reuse an existing message and are allowed.
     An unknown message source is denied with an explanation.
   - Fail closed: if a command mentions `git` and cannot be parsed, it is denied.
5. `guard-commit.sh` is deleted in the same commit. `specs/README.md` points to the new file.

## C — CI

`ci.yml` gains a job `governance` ("Governance tests") that runs
`node --test scripts/governance/`. It needs no install step and finishes in seconds.

# Contract impact

None. Nothing under `apps/`, `services/` or `packages/` changes.

# Out of scope

- Other destructive git commands (`branch -D`, `update-ref`, `clean -fdx`, `checkout -- .`).
  Listed as residual risk; a follow-up spec can add them to the same deny table.
- A native `commit-msg` git hook. CI (spec 059) is the authority. This guard is the fast
  local layer.

# Acceptance criteria

- [ ] Commit 1 (tests only) fails against `guard-commit.sh`. Its output is pasted.
- [ ] Commit 2 is green: every deny case shows `exit=2`, every allow case shows `exit=0`.
- [ ] `node --test scripts/governance/` passes locally and in CI.
- [ ] `yarn lint` (the root config covers `scripts/`) and `yarn type-check` green.
- [ ] A real commit in this repo, with a Spec trailer, still goes through the new hook.

# Residual risk

Hooks inspect the command text Claude writes. A program that runs git itself (for example
a Node script calling `child_process`) is invisible to the guard. The sandbox (056) and CI
(059) are the layers that catch it.

# Analytics

None.
