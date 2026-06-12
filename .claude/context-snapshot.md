# Context snapshot — 2026-06-12T13:47:17Z

Saved before compaction. Re-read at session start or after /compact to restore orientation.

## Approved, in-flight specs
specs/001-delivery-date-picker.md
specs/002-ai-governance-layer.md
specs/003-docs-automation-and-roadmap.md
specs/004-complete-monorepo-migration.md
specs/005-pin-node-version.md
specs/006-brand-logos.md
specs/007-graphql-schema.md
specs/README.md

## Modified files


## Diff summary


## Recent commits
41cb436 feat(api): add the GraphQL schema contract + validity guard
374f3ea feat(ui): brand logo assets + themeable BrandLogo + favicon
2ed3e88 fix(hooks): activate the pinned Node in verify-on-stop
649bce0 chore(repo): pin Node 24 (current active LTS) instead of 22
0d899d0 chore(repo): pin Node version, drop the --ignore-engines workaround
3c58ab1 chore(scripts): update `dev` script to use scoped `@sorrel/frontend` workspace
09aead6 feat(ui): delivery date picker from the Sorrel design handoff
ff64727 chore(repo): complete monorepo migration, remove root Next starter

## Governance reminders (enforced by hooks)
- Spec-gated: implement ONLY specs/NNN-*.md with 'approved: yes'. Every commit needs a 'Spec: NNN' trailer.
- Source of truth: schema.graphql + packages/domain are canonical. No invented fields / endpoints / props / deps.
- Verification: 'yarn type-check' (and domain tests) must be green in-turn. "should work" is banned vocabulary.
