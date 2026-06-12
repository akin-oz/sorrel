#!/usr/bin/env bash
# PreCompact: snapshot orientation before context is compacted.
# Re-read .claude/context-snapshot.md at session start or after /compact.
set -u

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
SNAPSHOT="$PROJECT_DIR/.claude/context-snapshot.md"
cd "$PROJECT_DIR" 2>/dev/null || exit 0

APPROVED_SPECS=$(grep -rl 'approved:[[:space:]]*yes' specs/ 2>/dev/null | sort)

cat > "$SNAPSHOT" <<EOF
# Context snapshot — $(date -u +"%Y-%m-%dT%H:%M:%SZ")

Saved before compaction. Re-read at session start or after /compact to restore orientation.

## Approved, in-flight specs
${APPROVED_SPECS:-"(none found under specs/)"}

## Modified files
$(git diff --name-only HEAD 2>/dev/null || echo "none")

## Diff summary
$(git diff --stat HEAD 2>/dev/null || echo "no changes vs HEAD")

## Recent commits
$(git log --oneline -8 2>/dev/null || echo "no commits yet")

## Governance reminders (enforced by hooks)
- Spec-gated: implement ONLY specs/NNN-*.md with 'approved: yes'. Every commit needs a 'Spec: NNN' trailer.
- Source of truth: schema.graphql + packages/domain are canonical. No invented fields / endpoints / props / deps.
- Verification: 'yarn type-check' (and domain tests) must be green in-turn. "should work" is banned vocabulary.
EOF

echo "Context snapshot saved to .claude/context-snapshot.md"
exit 0
