#!/usr/bin/env bash
# Stop: keep the docs honest. If this session changed things a reader's docs should
# reflect (specs, the GraphQL contract, deps, or feature source) but no doc/README was
# touched, nudge ONCE to review and update them before wrapping up.
#
# Self-clears when: docs were just committed, docs are already in the working set, or a
# prior nudge already fired this stop cycle (stop_hook_active).
set -euo pipefail

INPUT=$(cat)
STOP_ACTIVE=$(printf '%s' "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null || echo false)
[ "$STOP_ACTIVE" = "true" ] && exit 0   # already nudged this cycle — let it stop

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR" 2>/dev/null || exit 0

# If the most recent commit already updated docs, we're current.
LAST=$(git log -1 --name-only --format='' 2>/dev/null || true)
if printf '%s\n' "$LAST" | grep -qE '(^|/)README\.md$|^docs/'; then
  exit 0
fi

# Uncommitted, doc-relevant changes this session (exclude deps/build output).
CHANGED=$(git status --porcelain 2>/dev/null | sed 's/^...//' | grep -vE 'node_modules/|\.next/' || true)
[ -z "$CHANGED" ] && exit 0

# High-signal triggers: specs, the GraphQL contract, any package.json, workspace source.
TRIGGERS=$(printf '%s\n' "$CHANGED" | grep -E '(^|/)specs/|(^|/)schema\.graphql$|(^|/)package\.json$|^apps/|^packages/|^services/' || true)
[ -z "$TRIGGERS" ] && exit 0

# Already touching docs this session? Then we're good.
if printf '%s\n' "$CHANGED" | grep -qE '(^|/)README\.md$|^docs/|\.md$'; then
  exit 0
fi

# Nudge once.
{
  echo "Docs check: this session changed files the docs may need to reflect, but no README/doc was updated:"
  printf '%s\n' "$TRIGGERS" | sed 's/^/  - /' | head -20
  echo ""
  echo "Review README.md / docs/ and the Roadmap, and update them if these changes affect what a reader sees, then finish."
  echo "If no doc change is warranted, say so explicitly and stop."
} >&2
exit 2
