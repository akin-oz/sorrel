---
spec: 056
title: Deny secret reads and destructive git, and turn on the Bash sandbox
status: accepted
approved: yes # ONLY a human flips this to yes — implementation is gated on it
tier: 1 # governance core — the boundary every other guard sits inside
owner: .claude/settings.json
---

# Problem / gap

`.claude/settings.json` has `"deny": []` while `.env`, `apps/web/.env`, `localhost.pem` and
`localhost-key.pem` sit in the working tree. Nothing stops Claude reading them, and nothing
stops `git push`, `git reset` or a force-push. There is also no `sandbox` block, so every
shell command runs with full disk and network access.

No approved spec covers the permission or sandbox layer; spec 015 covered only CI.

# Scope

Setting names come from https://code.claude.com/docs/en/sandboxing and
https://code.claude.com/docs/en/permissions (fetched 2026-10-05, Claude Code 2.1.286).

## A — Permission deny rules (`permissions.deny`)

```json
"deny": [
  "Read(**/.env)",
  "Read(**/.env.*)",
  "Read(**/*.pem)",
  "Read(~/.ssh/**)",
  "Read(~/.aws/**)",
  "Bash(git push)",
  "Bash(git push *)",
  "Bash(git reset)",
  "Bash(git reset *)"
]
```

- Per the docs, `Read` deny rules also cover `cat`/`head`/`tail`/`sed`/`tee` and redirections in
  Bash, but not `grep -r .` or a script that opens the file itself. The sandbox (B) closes that.
- `Bash(git push *)` does **not** match `git -C . push` or `git -c k=v push` (the docs list these
  exact forms). Spec 057's guard covers them. Force-push is a push, so both layers deny it.
- `Read(**/.env.*)` also hides `.env.example`. During implementation, test whether a
  `!`-negation re-allows it. If it does not, accept the loss: the template has no secrets
  and a human can paste it in.

## B — Sandbox block

```json
"sandbox": {
  "enabled": true,
  "failIfUnavailable": true,
  "allowUnsandboxedCommands": false,
  "filesystem": {
    "denyRead": ["~/.ssh", "~/.aws"]
  },
  "network": {
    "allowedDomains": []
  }
}
```

- The docs say `Read` deny rules are **merged** into the sandbox configuration, so `.env*` and
  `*.pem` are also blocked at OS level for sandboxed processes. `denyRead` repeats only the
  home-directory paths for clarity. Check the resolved list in `/sandbox` → Config.
- `allowedDomains` is built by measurement, not guessed:
  1. Run `yarn install --frozen-lockfile`, `yarn workspaces run test`, `yarn lint` and
     `yarn type-check` in a headless session where every unlisted host is refused and named:
     `claude -p --settings '{"sandbox":{"enabled":true,"allowUnsandboxedCommands":false,"network":{"strictAllowlist":true}}}'`.
  2. For each refused host, record the host, which command needed it, and why in the table
     below. Add only hosts a command actually needed.
  3. Do the same for any write outside the repo (for example the Yarn cache) and add the
     narrowest `filesystem.allowWrite` path.
- Starting point: `yarn.lock` resolves all 1,681 packages from `registry.yarnpkg.com`.
  Postinstall downloads (for example the Cypress binary) may add hosts. The run will show.

| Host / path                     | Needed by                                                  | Why                                                                                                                                                              | Approved |
| ------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `registry.yarnpkg.com`          | `yarn install`                                             | Run 1 (empty allowlist) logged `deny network-outbound registry.yarnpkg.com:443` ×40. The verbose run 3 showed it was the only host contacted (865 tarball URLs). | yes      |
| _(none)_                        | `yarn type-check`, `yarn lint`, `yarn workspaces run test` | No network. All three pass sandboxed: exit 0, 207 tests.                                                                                                         | n/a      |
| `~/Library/Caches/Yarn` (write) | `yarn install`                                             | Not granted. Yarn falls back to the writable sandbox temp folder (`/tmp/claude-501/.yarn-cache-501`). The cost is a cold cache per sandboxed install.            | no       |

Measured 2026-10-05 with headless `claude -p` runs under `strictAllowlist`; logs are in the
session scratchpad.

**Open finding:** a cold `yarn install` still fails inside the sandbox (`Error: aborted`, TLS
socket closed mid-download). The proxy is not the cause: `curl` (34 MB in 1.85 s) and Node
`fetch` with `NODE_USE_ENV_PROXY=1` both downloaded the same `next` tarball through it. Yarn 1's
own proxy client aborts, and lowering concurrency did not help. Two fix attempts failed; the
decision is the human's (see report).

**Path syntax found by testing:** the `Read(...)` deny rules are merged into the sandbox as
paths at the project root only, and the `!.env.example` carve-out does not carry over. So
`filesystem.denyRead` adds `./**/.env`, `./**/.env.*` and `./**/*.pem`, and
`filesystem.allowRead` re-opens `./.env.example`.

# Contract impact

None. No change to `schema.graphql`, `packages/domain` or any workspace under `apps/`,
`services/` or `packages/`.

# Out of scope

- Hook, CI and guard changes (specs 057 and 059).
- Credential masking (`sandbox.credentials` `mask`). The docs say it works only from user,
  managed or `--settings` scope, so a repo file cannot set it.
- `strictAllowlist`. The docs say a repo's settings file **cannot** set it. See residual risk.

# Acceptance criteria

- [ ] `Read` of `.env`, `apps/web/.env` and `localhost-key.pem` is refused (tool output pasted
      as evidence). The test uses a canary file with dummy content, never the real secrets.
- [ ] `cat .env.canary` in Bash is refused. A sandboxed `node -e "fs.readFileSync('.env.canary')"`
      is refused by the OS.
- [ ] `git push --dry-run` and `git reset --soft HEAD` are refused.
- [ ] `/sandbox` shows the sandbox as enabled. A probe `curl https://example.com` is refused.
- [ ] `yarn install --frozen-lockfile`, tests, lint and type-check all pass inside the
      sandbox with the recorded allowlist.
- [ ] `yarn type-check` green.

# Residual risk (stated, not fixed here)

- **bypassPermissions mode:** the docs say hosts outside `allowedDomains` are **allowed** in
  this mode unless `strictAllowlist` is on, and only user, managed or `--settings` scope can
  turn it on. Recommendation for the human: add
  `"sandbox": {"network": {"strictAllowlist": true}}` to `~/.claude/settings.json`.
- Hooks, MCP servers and the Read/Edit/WebFetch tools run **outside** the sandbox (per the docs).
- Sandboxed `yarn dev` and `next build` cannot read `apps/web/.env`. Run them yourself or
  through the preview tool.
- Commands typed at the `!` prompt run unsandboxed.

# Analytics

None.
