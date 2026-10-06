---
spec: 061
title: Apply the exit-intent armed guard to every exit-intent e2e test
status: accepted
approved: yes # ONLY a human flips this to yes — implementation is gated on it
tier: 2 # JD coverage — a trustworthy real-browser gate
owner: apps/web (cypress only)
---

# Problem / gap

`E2E (Chrome)` failed on PR #5 (2026-10-06), which changed only two Markdown files:

```
1) session-once guard: second mouseleave does NOT reopen the modal
AssertionError: Timed out retrying after 6000ms: Expected to find element: `[role="dialog"]`, but never found it.
```

Spec 044 added `window.__sorrelExitIntentArmed`, set inside `useExitIntent`'s effect once
the `mouseleave` listener is attached. Only the first test in
`apps/web/cypress/e2e/funnel/exit-intent.cy.ts` waits for it. Tests 2–4 wait only for
`cy.location("pathname")`, which is true before hydration. So their first
`trigger("mouseleave")` can land before the listener exists, and the dialog never opens.
It is a race on slow CI runners, not an app bug. The happy path and the other 7 spec files
passed in the same run.

No approved spec covers the remaining three tests. Spec 044 fixed only the first.

# Scope

One file: `apps/web/cypress/e2e/funnel/exit-intent.cy.ts`.

- In tests 2–4 ("fires the exit_intent_shown typed event…", "closes the modal when the
  user clicks Leave for now", "session-once guard…"), add
  `cy.window().should("have.property", "__sorrelExitIntentArmed");` after
  `cy.location(...)` and before the first `trigger("mouseleave")`.
- Optional, same file: move `visit` + the armed wait into one local helper
  (`visitArmed()`) so a future test cannot skip the guard. This is a refactor within the
  file, not a new dependency.

# Contract impact

None. No change to `schema.graphql`, `packages/domain`, `useExitIntent`, or any app code.
The flag already exists (spec 044).

# Out of scope

- `useExitIntent` behaviour or the session-once logic.
- Retries (`retries` in the Cypress config). That would hide the race, not remove it.
- Making `E2E (Chrome)` a required check. That is a separate governance decision.

# Acceptance criteria

- [ ] All four exit-intent tests wait for `__sorrelExitIntentArmed` before their first
      `mouseleave`.
- [ ] `E2E (Chrome)` green on the implementing PR, then green on a rerun of the same
      commit (two consecutive passes).
- [ ] `yarn type-check` and `yarn lint` green.

# Analytics

None changed. Test 2 keeps asserting `exit_intent_shown` in the analytics queue.
