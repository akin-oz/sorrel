---
description: Three-lens parallel review (contract, funnel, a11y) of the current branch vs main.
---

Run a three-lens review of all changes on this branch vs `main`. Spawn the three
review agents **in parallel**, each scoped to `git diff main...HEAD`:

1. **contract-guardian** — invented schema usage, manual network types, domain
   logic duplicated outside `packages/domain`, stealth dependencies.
2. **funnel-reviewer** — typed funnel events fire per step with correct
   `step` / `variant` / `error` props; abandonment recoverable.
3. **a11y-reviewer** — the delivery-date picker and wizard inputs against the
   focus/keyboard/ARIA/reduced-motion checklist.

Then synthesize a single verdict:

```
## Contract        [findings or "clean"]
## Funnel          [findings or "clean"]
## Accessibility   [findings or "clean"]

## Verdict
[safe to commit (note the Spec: NNN to use) | fix P0/P1 first]
```

Do not fix anything in this command — review only. Surface, don't patch.
