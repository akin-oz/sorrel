---
paths:
  - "services/api/**/*"
  - "specs/**/*.md"
---

# Rule: No Invention Outside the Spec

## Context

To prevent AI hallucination, scope creep, and architectural drift, your actions inside the backend and spec pipeline are strictly bounded by approved documentation.

## Constraints

1. **No Unspecified Endpoints:** Do not invent new GraphQL mutations or queries inside `services/api` unless explicitly documented in the active `specs/NNN-*.md`.
2. **No Stealth Dependencies:** Do not add external npm/yarn packages to any `package.json` to solve a problem unless it has been explicitly approved in the spec sheet.
3. **No Ghost UI States:** Every UI state (loading, error, edge case) must map to explicit requirements specified in the design notes or component contract.

## Enforcement Action

If a feature gap is identified during implementation, stop immediately. Present the gap to the human engineer and request an updated specification file before writing code.
