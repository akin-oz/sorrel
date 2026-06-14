# Context snapshot — 2026-06-14T10:44:18Z

Saved before compaction. Re-read at session start or after /compact to restore orientation.

## Approved, in-flight specs
specs/001-delivery-date-picker.md
specs/002-ai-governance-layer.md
specs/003-docs-automation-and-roadmap.md
specs/004-complete-monorepo-migration.md
specs/005-pin-node-version.md
specs/006-brand-logos.md
specs/007-graphql-schema.md
specs/008-apollo-server.md
specs/009-analytics-event-contract.md
specs/010-wizard-shell.md
specs/011-storyblok-cms.md
specs/012-landing-redesign.md
specs/013-web-apollo-write-path.md
specs/014-funnel-evidence.md
specs/015-ci-seo-lighthouse.md
specs/016-cats-step.md
specs/017-summary-step.md
specs/018-app-ui-layer.md
specs/019-funnel-desktop-and-nav-parity.md
specs/020-funnel-form-validation.md
specs/022-profile-pills-and-assessment-offer.md
specs/023-live-posthog-insights.md
specs/024-calendar-ui-interaction-tests.md
specs/025-calendar-a11y-hardening.md
specs/028-calendar-cell-hover-press.md
specs/029-calendar-reduced-motion-tightening.md
specs/README.md

## Modified files
.claude/context-snapshot.md

## Diff summary
 .claude/context-snapshot.md | 34 ----------------------------------
 1 file changed, 34 deletions(-)

## Recent commits
5f459ed test(ui+domain): pin DeliveryDatePicker behaviours and calendar edge cases (spec 024)
d9748ff feat(web): /insights reads live PostHog with a static fallback; finish the pills re-narration (spec 023)
66ba906 docs(specs): approve 029 — tighten reduced-motion fallback
b8337f9 docs(specs): approve 028 — calendar cell hover + press feedback
7d14a45 docs(specs): approve 025 — calendar dialog a11y hardening
85c207e docs(specs): approve 024 — calendar UI interaction test pack
7e3e260 docs(specs): add draft spec 029 — tighten reduced-motion fallback
2032aa8 docs(specs): add draft spec 028 — calendar cell hover + press feedback

## Governance reminders (enforced by hooks)
- Spec-gated: implement ONLY specs/NNN-*.md with 'approved: yes'. Every commit needs a 'Spec: NNN' trailer.
- Source of truth: schema.graphql + packages/domain are canonical. No invented fields / endpoints / props / deps.
- Verification: 'yarn type-check' (and domain tests) must be green in-turn. "should work" is banned vocabulary.
