---
spec: 003
title: Product README + docs-drift hook + roadmap status command
approved: yes
tier: 1
owner: .claude · README.md
---

# Problem / gap

The repo is public-readable mid-build, so it needs a credible, honest README. The
governance layer should also keep docs from drifting as work lands, and report roadmap
position on demand.

# Scope

- `README.md` — product-framed thesis, the funnel, a tight decisions list, architecture
  map, "how this was built" chapter, and an honest tiered roadmap.
- `.claude/hooks/docs-update-check.sh` (Stop) — nudge once when a session changes
  specs / schema / deps / workspace source without touching docs.
- `.claude/commands/roadmap.md` — `/roadmap` status report against the tiers.
- `.claude/settings.json` — wire the new Stop hook.

# Contract impact

None.

# Out of scope

- Auto-committing docs from a hook — committing stays an explicit, Spec-gated action.
- Generated assets (mobile GIF, Lighthouse screenshot, funnel-curve image) — Tier-1 exit.

# Acceptance criteria

- [x] README is product-framed and honest about WIP (no claimed metrics that don't exist)
- [x] Decisions kept tight (conversion + measurement, not frontend depth)
- [x] docs-drift hook nudges at most once per stop cycle; self-clears when docs were just committed
- [x] `/roadmap` reports done / in-progress / gaps / next
- [x] No real-brand names, logos, copy, or assets

# Analytics

None — docs and tooling.
