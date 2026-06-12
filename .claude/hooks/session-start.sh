#!/usr/bin/env bash
# SessionStart: surface the governance state up front (visible trace).
# Stdout is injected into the session as context.
set -u

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR" 2>/dev/null || exit 0

SPECS=$(ls specs/[0-9]*.md 2>/dev/null | wc -l | tr -d ' ')
APPROVED=$(grep -rl 'approved:[[:space:]]*yes' specs/ 2>/dev/null | wc -l | tr -d ' ')
DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

echo "Sorrel governance — ${APPROVED:-0}/${SPECS:-0} specs approved · ${DIRTY:-0} uncommitted change(s)."
echo "Enforced by hooks: spec-gated execution, source-of-truth guards, 'Spec: NNN' commit trailers, green-tree verification on Stop."
exit 0
