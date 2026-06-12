#!/usr/bin/env bash
# Stop: the deterministic-verification gate. Runs `yarn type-check` (and domain
# unit tests if present). Exit 2 keeps the turn open until the tree is green.
# Per .claude/rules/verification.md: prove it in-turn — "should work" is banned.
set -euo pipefail

INPUT=$(cat)
STOP_ACTIVE=$(printf '%s' "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null || echo false)
[ "$STOP_ACTIVE" = "true" ] && exit 0   # avoid re-entrant loops

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR"

# Toolchain not installed → can't verify; warn but don't block scaffolding.
if [ ! -d node_modules ]; then
  echo "verify-on-stop: node_modules missing — run 'yarn install' to enable the verification gate." >&2
  exit 0
fi

# The repo pins Node (engines requires >=20.19); activate it via nvm so yarn can
# run even when the hook runner's shell defaults to an older Node.
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  export NVM_DIR="$HOME/.nvm"
  set +u
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm use >/dev/null 2>&1 || true
  set -u
fi

# Only verify when source actually changed vs HEAD.
CHANGED=$(git diff --name-only HEAD 2>/dev/null | grep -E '\.(ts|tsx|js|jsx|graphql)$' || true)
[ -z "$CHANGED" ] && exit 0

LOG="${TMPDIR:-/tmp}/sorrel-verify.log"

echo "==> yarn type-check" >&2
if ! yarn type-check >"$LOG" 2>&1; then
  cat "$LOG" >&2
  echo "" >&2
  echo "Type-check failed. The turn is NOT complete until 'yarn type-check' is clean (0 errors)." >&2
  exit 2
fi

# Domain unit tests, if the workspace exposes a test script.
if [ -f packages/domain/package.json ] && grep -q '"test"' packages/domain/package.json 2>/dev/null; then
  DOMAIN_PKG=$(jq -r '.name // empty' packages/domain/package.json 2>/dev/null || true)
  if [ -n "$DOMAIN_PKG" ]; then
    echo "==> yarn workspace $DOMAIN_PKG test" >&2
    if ! yarn workspace "$DOMAIN_PKG" test >"$LOG" 2>&1; then
      cat "$LOG" >&2
      echo "" >&2
      echo "Domain tests failed. Fix before finishing the turn." >&2
      exit 2
    fi
  fi
fi

echo "Verification gate passed: type-check + domain tests green." >&2
exit 0
