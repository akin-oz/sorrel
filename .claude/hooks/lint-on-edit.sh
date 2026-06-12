#!/usr/bin/env bash
# PostToolUse (Edit|Write|MultiEdit): lint + format-check the edited file so
# violations surface in the SAME turn (fast deterministic-verification loop).
# Exit 2 feeds the failure back to Claude to fix before continuing.
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || true)
[ -z "$FILE_PATH" ] && exit 0
[ -f "$FILE_PATH" ] || exit 0

case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs) : ;;
  *) exit 0 ;;
esac

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR"
[ -d node_modules ] || exit 0   # toolchain not installed yet — skip quietly

# Lint from the nearest workspace that owns an ESLint config. In this monorepo
# apps/web self-lints via eslint-config-next; the root flat config covers the
# rest. Running the root config over apps/web pulls in an eslint-plugin-react
# that is incompatible with ESLint 10 — so route each file to its own config.
ESLINT_DIR="$PROJECT_DIR"
dir="$(dirname "$FILE_PATH")"
while [ "$dir" != "$PROJECT_DIR" ] && [ "$dir" != "/" ]; do
  if ls "$dir"/eslint.config.* >/dev/null 2>&1; then
    ESLINT_DIR="$dir"
    break
  fi
  dir="$(dirname "$dir")"
done

FAIL=0
if ! ( cd "$ESLINT_DIR" && npx --no-install eslint --max-warnings 0 "$FILE_PATH" ) 2>&1; then
  echo "" >&2
  echo "ESLint failed on $FILE_PATH (zero-warning policy). Fix before continuing." >&2
  FAIL=1
fi
if ! npx --no-install prettier --check "$FILE_PATH" 2>&1; then
  echo "" >&2
  echo "Prettier check failed on $FILE_PATH. Run 'yarn format' or fix manually." >&2
  FAIL=1
fi

[ "$FAIL" -eq 1 ] && exit 2
exit 0
