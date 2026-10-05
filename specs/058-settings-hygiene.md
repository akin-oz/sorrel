---
spec: 058
title: Settings hygiene — explicit MCP allowlist, no one-off permanent allows, no stale worktrees
status: proposed
approved: no # ONLY a human flips this to yes — implementation is gated on it
tier: 2 # governance hygiene
owner: .claude/settings.local.json · .gitignore
---

# Problem / gap

1. `.claude/settings.local.json` sets `"enableAllProjectMcpServers": true`, so any server
   someone adds to `.mcp.json` starts without approval. The file already lists
   `enabledMcpjsonServers: ["storyblok"]`, and `storyblok` is the only server `.mcp.json`
   defines. The blanket flag adds nothing except risk.
2. One-off commands were saved as permanent allows:
   - `Bash(echo "=== sorrel .claude tree ===" && find … && ls -la /Users/akinoztorun/Documents/projects/ …)`
   - `Bash(git -C /Users/akinoztorun/Documents/projects/sorrel ls-files --cached)`
   - `Bash(grep -E "^\\.env$")`
3. Three frozen repo copies lived in `.claude/worktrees/agent-*`, untracked and not ignored.

# Scope

- `settings.local.json`: delete `enableAllProjectMcpServers` and keep
  `enabledMcpjsonServers: ["storyblok"]`. Delete the three one-off allows above. The MCP tool
  allows (`stripe`, `Vercel list_teams`) and `WebSearch` stay.
- `.gitignore`: add `.claude/worktrees/` so a future agent worktree never shows up as
  untracked.
- Worktrees: **already removed on 2026-10-05, with the human's explicit approval in chat.**
  Before removal:

  | Worktree                  | Size | Last modified    | Uncommitted work (discarded)                                       |
  | ------------------------- | ---- | ---------------- | ------------------------------------------------------------------ |
  | `agent-a3487bb9a33c7736f` | 2.8M | 2026-06-17 17:43 | Hero.tsx, next.config.ts, ui components.tsx, AppImage.stories.tsx  |
  | `agent-a81e47d97ad95d741` | 2.8M | 2026-06-17 17:42 | domain calendar(.test).ts, DeliveryDatePicker(.stories).tsx        |
  | `agent-a96a9645d49a96acb` | 2.8M | 2026-06-17 17:43 | lint-on-edit.sh, WizardChrome.tsx, de/en.json, analytics events.ts |

  The command was `git worktree remove --force` plus `git branch -D worktree-agent-*` for each.

Note: `settings.local.json` is ignored by the user-global gitignore (`~/.config/git/ignore`),
so its edits are local and appear in no commit. This spec is their record.

# Contract impact

None.

# Out of scope

- Moving any allow into the shared `settings.json`.
- `.mcp.json` contents. Its values are never read; only server names were listed.

# Acceptance criteria

- [ ] `jq 'has("enableAllProjectMcpServers")' .claude/settings.local.json` → `false`.
- [ ] `jq '.enabledMcpjsonServers' …` lists exactly the server names in `.mcp.json`
      (`jq '.mcpServers|keys'`).
- [ ] `grep -c 'sibling project dirs' .claude/settings.local.json` → `0`.
- [ ] `git worktree list` shows only the main checkout. `git status` no longer lists
      `.claude/worktrees/`.

# Analytics

None.
