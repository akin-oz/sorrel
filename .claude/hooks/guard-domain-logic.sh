#!/usr/bin/env bash
# PreToolUse (Edit|Write|MultiEdit): anti-drift guard for the domain core.
#
# Per .claude/rules/source-of-truth.md, pricing, portion calc, and plan
# invariants live EXCLUSIVELY in packages/domain. guard-source-of-truth.sh is
# path-based — it asks before you touch packages/domain. This hook closes the
# OPPOSITE hole: it catches that same maths being (re)written INTO services/api
# or apps/web, where it must never live. (computePlan + money helpers once
# drifted into services/api precisely because nothing enforced this.)
#
# It scans the proposed content for derivation signatures — the maths itself,
# not mere references. Boundary code that maps the domain's output
# (`amountMinor: m.amountMinor`) carries no arithmetic and passes; re-deriving a
# portion or a price trips a signature. We don't hard-deny — we "ask", pointing
# the edit at packages/domain, so drift becomes a conscious, logged decision.
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || true)
[ -z "$FILE_PATH" ] && exit 0

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
REL_PATH="${FILE_PATH#"$PROJECT_DIR"/}"

# Only the two framework layers that must import the domain, never inline it.
case "$REL_PATH" in
  services/api/src/*|apps/web/*) : ;;
  *) exit 0 ;;
esac
# Never the domain itself, generated code, or tests (which legitimately assert
# on the maths' outputs).
case "$REL_PATH" in
  *__generated__*|*.gen.ts|*.test.ts|*.test.tsx) exit 0 ;;
esac
case "$REL_PATH" in
  *.ts|*.tsx) : ;;
  *) exit 0 ;;
esac

# The proposed new content, across whichever tool fired (Write/.content,
# Edit/.new_string, MultiEdit/.edits[].new_string).
CONTENT=$(printf '%s' "$INPUT" | jq -r '
  (.tool_input.content // empty),
  (.tool_input.new_string // empty),
  ((.tool_input.edits // []) | map(.new_string) | join("\n"))
' 2>/dev/null || true)
[ -z "$CONTENT" ] && exit 0

# Domain-logic signatures: derivation, not reference.
HIT=""
match() { if printf '%s' "$CONTENT" | grep -Eq "$1"; then HIT="$2"; fi; }

match 'weightKg[[:space:]]*\*|reduce\([^)]*weightKg' \
  "portion calculation (weight → grams)"
match '\?[[:space:]]*(14|28)[[:space:]]*:[[:space:]]*(14|28)|mealsPerBox[[:space:]]*[=:][[:space:]]*(14|28)\b' \
  "the box-size / meals-per-box rule"
match 'amountMinor[[:space:]]*[-+*/][[:space:]]*[0-9]|[-+*/][[:space:]]*amountMinor|/[[:space:]]*100[[:space:]]*\)[[:space:]]*\.toFixed|\*[[:space:]]*0\.5' \
  "money arithmetic / price derivation"
match '\b(function|const|let|var)[[:space:]]+(stubMoney|formatMinor|computePrice|computePortion|computePortionGrams)\b' \
  "a pricing/portion helper definition"

[ -z "$HIT" ] && exit 0

jq -n --arg p "$REL_PATH" --arg what "$HIT" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "ask",
    permissionDecisionReason: ("This edit looks like " + $what + ":\n  → " + $p + "\nPricing, portion calc, and plan invariants live EXCLUSIVELY in packages/domain (.claude/rules/source-of-truth.md). Import from @sorrel/domain and map at the boundary — never inline the maths in services/api or apps/web.\nApprove ONLY if this is genuine boundary/mapping code, not a reimplementation.")
  }
}'
exit 0
