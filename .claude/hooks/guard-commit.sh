#!/usr/bin/env bash
# PreToolUse (Bash): enforce the commit contract for spec-gated execution.
#   1. Every `git commit` must carry a `Spec: NNN` trailer.
#   2. No `git commit --no-verify` / `-n` (verification hooks are the definition of done).
#   3. Never stage or commit .env* secrets.
set -euo pipefail

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || true)
[ -z "$CMD" ] && exit 0

deny() { printf '%s\n' "$1" >&2; exit 2; }

# 3. Secrets — never stage/commit env files. Template names (.env.example /
# .env.sample / .env.template) are exempt — they never carry real values and
# spec 040 §3 requires .env.example as the onboarding template. Anything else
# matching .env* is blocked.
if printf '%s' "$CMD" | grep -qE '(^|[^[:alnum:]_])git[[:space:]]+(add|commit)'; then
  if printf '%s' "$CMD" | grep -oE '\.env[A-Za-z0-9_.-]*' \
    | grep -vE '^\.env\.(example|sample|template)$' | grep -q .; then
    deny "BLOCKED: refusing to stage/commit .env* files. Use environment variables or a secrets manager."
  fi
fi

# Only inspect real commits
if printf '%s' "$CMD" | grep -qE '(^|[^[:alnum:]_])git[[:space:]]+commit'; then

  # 2. No bypassing verification
  if printf '%s' "$CMD" | grep -qE '(--no-verify|(^|[[:space:]])-n([[:space:]]|$))'; then
    deny "BLOCKED: 'git commit --no-verify' is not allowed. The verification hooks ARE the definition of done."
  fi

  # --amend --no-edit / -C reuse an existing (already-trailered) message — allow
  if printf '%s' "$CMD" | grep -qE '(--amend.*--no-edit|--no-edit.*--amend|(^|[[:space:]])-C[[:space:]])'; then
    exit 0
  fi

  # 1. Require a `Spec: NNN` trailer somewhere in the command (covers -m and heredoc -F)
  if ! printf '%s' "$CMD" | grep -qE 'Spec:[[:space:]]*[0-9]{3}'; then
    deny "BLOCKED: commit is missing a 'Spec: NNN' trailer.
Every commit must reference the approved spec it implements, e.g.:

  git commit -m \"feat(wizard): add cat-quantity step\" -m \"Spec: 003\"

If no approved spec covers this work, write one first:
  specs/NNN-name.md  with  approved: yes  in the front-matter (use /spec-new)."
  fi
fi

exit 0
