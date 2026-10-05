#!/usr/bin/env bash
# Spec gate (spec 015): every non-merge commit in <base>..<head> must carry a
# `Spec: NNN` trailer that resolves to an approved spec. Extracted verbatim from
# .github/workflows/spec-gate.yml so it can be tested (spec 059).
# Usage: spec-gate.sh <base> <head>   (run from the repo root, head checked out)
set -euo pipefail
BASE=$1
HEAD=$2
fail=0
# Non-merge commits introduced by this PR.
commits=$(git rev-list --no-merges "$BASE..$HEAD")
if [ -z "$commits" ]; then
  echo "No commits to check."
  exit 0
fi
for c in $commits; do
  subject=$(git log -1 --format=%s "$c")
  spec=$(git log -1 --format=%B "$c" | grep -oiE 'Spec:[[:space:]]*[0-9]{3}' | head -1 | grep -oE '[0-9]{3}' || true)
  if [ -z "$spec" ]; then
    echo "::error::Commit ${c:0:9} (\"$subject\") is missing a 'Spec: NNN' trailer."
    fail=1
    continue
  fi
  file=$(ls "specs/${spec}-"*.md 2>/dev/null | head -1 || true)
  if [ -z "$file" ]; then
    echo "::error::Commit ${c:0:9} references Spec: $spec, but specs/${spec}-*.md does not exist."
    fail=1
  elif ! grep -qiE '^approved:[[:space:]]*yes' "$file"; then
    echo "::error::Commit ${c:0:9} references Spec: $spec, but $file is not 'approved: yes'."
    fail=1
  else
    echo "ok: ${c:0:9} \"$subject\" -> $file"
  fi
done
if [ "$fail" -ne 0 ]; then
  echo ""
  echo "Every commit must reference an approved spec. See .claude/CLAUDE.md (Spec-Gated Execution)."
  exit 1
fi
