#!/usr/bin/env bash
# PreToolUse (Edit|Write|MultiEdit): human-in-the-loop on the source-of-truth files.
#
# Per .claude/CLAUDE.md (Spec-Gated Execution) and .claude/rules/source-of-truth.md:
#   schema.graphql + packages/domain are canonical; governance and build config are frozen.
# We don't hard-deny — we surface an "ask" so a human consciously approves every change
# to a contract file. Governance = stop for approval, not silent rewrites.
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || true)
[ -z "$FILE_PATH" ] && exit 0

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
REL_PATH="${FILE_PATH#"$PROJECT_DIR"/}"
BASENAME=$(basename "$REL_PATH")

ask() {
  jq -n --arg p "$REL_PATH" --arg why "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: ($why + "\n  → " + $p + "\nApprove ONLY if an approved spec (specs/NNN-*.md, approved: yes) covers this change.")
    }
  }'
  exit 0
}

# Path-based guards
case "$REL_PATH" in
  schema.graphql|*/schema.graphql)
    ask "schema.graphql is the API contract — the single source of truth. Generated types depend on it; an invented field must be a compile error, never a hand-edit." ;;
  packages/domain/*)
    ask "packages/domain is the domain core. Pricing rules, portion calc and plan invariants live here EXCLUSIVELY — never duplicated into apps/web." ;;
  .claude/CLAUDE.md|.claude/rules/*)
    ask "Governance files are frozen. Rule changes must be deliberate and human-approved (treat like an ADR)." ;;
esac

# Filename-based guards (config / contract-adjacent — no stealth dependencies)
case "$BASENAME" in
  package.json|tsconfig.json|tsconfig*.json|next.config.ts|next.config.js|next.config.mjs|eslint.config.mjs|eslint.config.js|turbo.json|codegen.ts|codegen.yml|codegen.yaml)
    ask "Build/config is contract-adjacent. Dependency or config changes need explicit approval — no stealth dependencies (.claude/rules/no-invention.md)." ;;
esac

exit 0
