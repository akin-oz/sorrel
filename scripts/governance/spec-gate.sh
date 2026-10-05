#!/usr/bin/env bash
# Spec gate (specs 015, 059): every non-merge commit in <base>..<head> must cite
# an approved spec.
#
#   missing     — no `Spec: NNN` *trailer* (parsed by git interpret-trailers;
#                 a mention in the body does not count). Every trailer is checked.
#   unknown     — no specs/NNN-*.md at <head>, or more than one.
#   unapproved  — the spec's front-matter is not `approved: yes` AT <base>.
#                 Approval written inside the PR does not count: approval must
#                 already be on main, merged by a human.
#   spec-only   — a commit touching only specs/** (a draft or an approval flip)
#                 needs its spec to exist at <head>, nothing more.
#
# Reads git objects only; never executes code from the range. Run it from a
# checkout of the BASE (see .github/workflows/spec-gate.yml).
# Usage: spec-gate.sh <base> <head>
set -euo pipefail
BASE=$(git rev-parse --verify "$1^{commit}")
HEAD=$(git rev-parse --verify "$2^{commit}")
fail=0

err() {
  echo "::error::$*"
  fail=1
}

# Exit 0 iff the blob at <rev:path> has front-matter (first line `---`) whose
# block, up to the closing `---`, contains `approved: yes`.
approved_at() {
  git show "$1" 2>/dev/null | awk '
    NR == 1 { if ($0 != "---") exit; next }
    $0 == "---" { exit }
    /^approved:[[:space:]]*yes([[:space:]#]|$)/ { found = 1 }
    END { exit !found }'
}

commits=$(git rev-list --no-merges --reverse "$BASE..$HEAD")
if [ -z "$commits" ]; then
  echo "No commits to check."
  exit 0
fi

for c in $commits; do
  short=${c:0:9}
  subject=$(git log -1 --format=%s "$c")
  specs=$(git log -1 --format=%B "$c" | git interpret-trailers --parse |
    grep -iE '^Spec:[[:space:]]*[0-9]{3}[[:space:]]*$' | grep -oE '[0-9]{3}' || true)
  if [ -z "$specs" ]; then
    err "Commit $short (\"$subject\") is missing a 'Spec: NNN' trailer."
    continue
  fi

  spec_only=yes
  if git diff-tree --root --no-commit-id --name-only -r "$c" | grep -qv '^specs/'; then
    spec_only=no
  fi

  for n in $specs; do
    matches=$(git ls-tree -r --name-only "$HEAD" -- specs/ | grep -E "^specs/${n}-[^/]*\.md$" || true)
    count=$(printf '%s' "$matches" | grep -c . || true)
    if [ "$count" -eq 0 ]; then
      err "Commit $short (\"$subject\") cites Spec: $n — unknown spec: no specs/${n}-*.md exists."
      continue
    elif [ "$count" -gt 1 ]; then
      err "Commit $short (\"$subject\") cites Spec: $n — ambiguous: $(echo $matches)."
      continue
    fi
    if [ "$spec_only" = yes ]; then
      echo "ok: $short \"$subject\" -> $matches (spec-only commit)"
    elif approved_at "$BASE:$matches"; then
      echo "ok: $short \"$subject\" -> $matches (approved at base)"
    else
      err "Commit $short (\"$subject\") cites Spec: $n, but $matches is not approved at base (${BASE:0:9}). Merge the approval to main first."
    fi
  done
done

if [ "$fail" -ne 0 ]; then
  echo ""
  echo "Every commit must cite a spec approved on the base branch. See specs/README.md (Governance layers)."
  exit 1
fi
