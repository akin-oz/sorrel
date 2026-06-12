---
spec: 001
title: Delivery date picker (Tier-1 centerpiece)
status: proposed
approved: yes
tier: 1
owner: packages/ui
---

# Problem / gap
The wizard's delivery-date step needs the flagship checkout interaction: a date
picker that is a superset of a basic calendar task and doubles as the design-system
proof (one logic shell, two brand skins). No approved spec covers it yet.

# Scope
- `packages/ui` — the picker component, its date logic, Storybook story, and tests.
- Consumed by the `/wizard/delivery-date` step in `apps/web` (integration only; the
  step's own spec is separate).
- Two token themes render the SAME component as two brands.

# Contract impact
None to `schema.graphql`. Date/availability math that is domain logic (which
weekdays are deliverable) belongs in `packages/domain` or a pure util in
`packages/ui` — never duplicated in `apps/web`.

# Behaviour
- Pre-selected earliest deliverable date; a "change" button opens an animated modal over an overlay.
- Current-month grid, **Monday-first** columns; **Tuesdays, Fridays, Saturdays blocked** (never the initial date).
- Single selection; closed-state calendar icon shows the selected day number dynamically.
- Cancel vs confirm semantics; backdrop click closes correctly; grid handles any start/end weekday and month boundaries.
- Exit animation via a three-state machine (open → closing → closed); unmount on `animationend`.

# Out of scope
- Server persistence of the chosen date (handled by the plan/checkout specs).
- Real delivery-availability API; blocked weekdays are static rules for the demo.

# Acceptance criteria
- [ ] `yarn type-check` green (0 errors/warnings)
- [ ] Unit tests cover date logic across month boundaries (28/29/30/31) and blocked weekdays
- [ ] Focus trap, ESC, return-focus, `aria-modal`, roving-tabindex grid nav, `aria-disabled`+reason on blocked days, `prefers-reduced-motion` fallback
- [ ] Storybook story renders the component under both token themes
- [ ] No real-brand names, logos, copy, or assets

# Analytics
- `step_completed` with `{ step: "delivery-date" }` on confirm.
- `field_error` with `{ step: "delivery-date", error }` if confirm is attempted with no valid date.
