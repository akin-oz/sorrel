---
spec: 033
title: ESLint guard — UI/web cannot inline calendar/delivery-date domain logic
approved: yes
tier: 2 # JD coverage / governance hardening — the centerpiece works; this prevents drift
owner: root eslint.config.mjs · apps/web/eslint.config.mjs · packages/ui · apps/web
---

# Problem / gap

The CLAUDE.md / `.claude/rules/source-of-truth.md` invariant "domain core is
canonical; the UI imports, never re-implements" is currently enforced only by
human code review and ad-hoc audit passes. A developer can paste

```ts
const BLOCKED_WEEKDAY_INDEXES = new Set([1, 4, 5]);
```

into `packages/ui/src/DeliveryDatePicker.tsx` or any `apps/web/**` file and CI
will go green: `yarn type-check && yarn lint` does not complain, and the
domain unit tests in `packages/domain` keep passing because they only cover
`packages/domain`. The spec-013 anti-drift script protects the schema/domain
boundary on the server side, but there is no equivalent for the UI side of the
"one logic shell, two skins" centerpiece.

A code-quality review of the centerpiece flagged this as CQ-04 in the Phase 4
audit notes: a Jest "this token does not appear in this file" test would be
brittle and
slow, but ESLint's `no-restricted-syntax` + `no-restricted-imports` are the
right shape for the constraint. The same pair already enforces the spec-018
App\* / inline-`sx` boundary in `apps/web/eslint.config.mjs`, so this spec
extends an established pattern rather than inventing one.

No existing spec covers this: spec 001 ships the picker, spec 018 bans inline
`sx` and raw `@mui/@emotion` imports in `apps/web`, spec 013 guards the
schema/domain on the server. The UI ↔ domain boundary is the remaining gap.

# Scope

The exact symbols, files, and selectors this spec touches.

## Symbols guarded

These are the public identifiers exported from
`packages/domain/src/delivery/calendar.ts` (verified against current source):

- `BLOCKED_WEEKDAY_INDEXES`
- `blockedInfo`
- `earliestDeliverableDate`
- `buildMonthView`
- `mondayIndex`
- `isDeliverableWeekday`
- `moveFocus`

Plus the raw `Date` mutators that constitute the domain's calendar arithmetic:

- `setUTCDate`
- `setUTCMonth`
- `setUTCFullYear`

## Files where the rule applies

- `packages/ui/src/**/*.{ts,tsx}`
- `apps/web/**/*.{ts,tsx}`

## Files where the rule does NOT apply

- `packages/domain/**` — the domain owns these symbols and the arithmetic.
- `**/*.test.{ts,tsx}` — domain tests in `packages/domain/src/delivery/*.test.ts`
  call these directly; UI tests in `packages/ui/src/DeliveryDatePicker.test.tsx`
  may exercise them via the public component API but currently do not declare
  them. Exempting `*.test.*` keeps the rule honest about runtime code while
  letting tests stay flexible.

## Config files touched

- `/Users/akinoztorun/Documents/projects/sorrel/eslint.config.mjs` — root flat
  config; add a new override block keyed on
  `files: ["packages/ui/**/*.{ts,tsx}"]` (plus `apps/web/**` if the root config
  is the canonical place; see Decision A below).
- `/Users/akinoztorun/Documents/projects/sorrel/apps/web/eslint.config.mjs` —
  flat config that currently extends `eslint-config-next` and holds the
  spec-018 `no-restricted-syntax` / `no-restricted-imports` block. The
  calendar guard sits next to it as a second block of the same shape.

## Symbols this rule must NOT prohibit

Sanity-checking against the current tree (so the spec does not regress
spec-001 behaviour):

- `packages/ui/src/DeliveryDatePicker.tsx` line 66 declares a function
  parameter named `mondayIndex`. This is **not** a re-declaration of the
  domain symbol; it is a local parameter to a helper that resolves a
  Monday-first weekday label via `Intl.DateTimeFormat`. The rule must target
  variable/function/const **declarations** of the banned names at module
  scope or higher, not parameter names or property keys. See Decision B
  below.
- `packages/ui/src/DeliveryDatePicker.tsx` lines 19-24 import
  `buildMonthView`, `earliestDeliverableDate`, `moveFocus` from
  `@sorrel/domain`. Imports from `@sorrel/domain` /
  `@sorrel/domain/delivery` are the **only** way these names may enter the
  UI/web layers and must remain allowed.

## Selector shape (proposed)

Two restrictions, both error-level:

1. `no-restricted-syntax` with selectors that match **declarations** of the
   guarded names (not references):
   - `VariableDeclarator[id.name='BLOCKED_WEEKDAY_INDEXES']`
   - `VariableDeclarator[id.name='blockedInfo']`
   - `VariableDeclarator[id.name='earliestDeliverableDate']`
   - `VariableDeclarator[id.name='buildMonthView']`
   - `VariableDeclarator[id.name='mondayIndex']`
   - `VariableDeclarator[id.name='isDeliverableWeekday']`
   - `VariableDeclarator[id.name='moveFocus']`
   - `FunctionDeclaration[id.name='blockedInfo']` (and the other names that
     could be re-declared as functions)
   - `MemberExpression[property.name='setUTCDate']`
   - `MemberExpression[property.name='setUTCMonth']`
   - `MemberExpression[property.name='setUTCFullYear']`

2. `no-restricted-imports` is **not** the primary lever here (the UI is
   expected to import these from `@sorrel/domain`). It is only added as a
   secondary guard if Decision B picks a wider net.

## Error message (exact text)

> "Calendar / delivery-date logic lives in @sorrel/domain. Import it; do not inline."

This string is part of the contract — the acceptance test pastes a violation
and asserts this message in the lint output.

# Contract impact

None. No change to `schema.graphql`, no change to the public surface of
`@sorrel/domain` or `@sorrel/ui`, no generated-type consequence. ESLint
configuration only. No new npm dependencies (`no-restricted-syntax` and
`no-restricted-imports` are core ESLint rules already in use via the
spec-018 block).

# Out of scope

- Branding `IsoDate` as a nominal type (a separate code-quality suggestion
  from the same audit notes). That is a `packages/domain` type change with
  generated-code consequences and deserves its own spec.
- Broader architectural lint rules: RSC-vs-client boundary, no `useState` in
  RSC files, no `process.env` in client components, etc. Each is a separate
  governance spec.
- The schema-side guard against domain drift into `services/api` —
  already covered by the spec-013 anti-drift script and the
  `guard-domain-logic.sh` hook.
- Pricing / portion / plan-invariant identifiers (`computePlan`,
  `portionFromWeight`, money helpers). Those are the server-side concern
  guarded elsewhere; this spec is scoped to the **calendar/delivery-date**
  surface that the UI centerpiece touches.
- Auto-fix support. The rule is `error`-only; a violation is intentional code
  the human must rewrite by importing from `@sorrel/domain`.

# Acceptance criteria

- [ ] `yarn type-check && yarn lint` is green against the current tree with
      the new rule in place — **zero new lint errors**, **zero**
      `eslint-disable` / `eslint-disable-next-line` comments added to any
      existing file to silence the rule.
- [ ] An intentional violation — pasting
      `const BLOCKED_WEEKDAY_INDEXES = new Set([1, 4, 5]);`
      at module scope of `packages/ui/src/DeliveryDatePicker.tsx` — causes
      `yarn lint` to fail with the exact message:
      `Calendar / delivery-date logic lives in @sorrel/domain. Import it; do not inline.`
- [ ] The same violation pasted into a file under `apps/web/**/*.{ts,tsx}`
      also fails with the same message.
- [ ] An intentional `someDate.setUTCDate(someDate.getUTCDate() + 3)` pasted
      into either layer fails with the same message.
- [ ] The legitimate existing import at
      `packages/ui/src/DeliveryDatePicker.tsx` lines 19-24 continues to lint
      clean (no false positive on imported references).
- [ ] The function parameter `mondayIndex` at
      `packages/ui/src/DeliveryDatePicker.tsx` line 66 continues to lint
      clean (no false positive on parameter names).
- [ ] The rule does not fire inside `packages/domain/**` or
      `**/*.test.{ts,tsx}`.
- [ ] A new spec-coupled commit subject + `Spec: 033` trailer accompanies the
      change.

# Decisions the human must approve

These are the only judgement calls baked into this spec — please confirm
before flipping `approved: yes`.

**Decision A — config location.** The root `eslint.config.mjs` is the
canonical place for repo-wide governance rules, but the spec-018 `sx` /
`@mui` ban already lives in `apps/web/eslint.config.mjs` (one level down).
The proposal: put the **calendar guard** in the **root** `eslint.config.mjs`
with two `files` globs (`packages/ui/**/*.{ts,tsx}` and
`apps/web/**/*.{ts,tsx}`), so a single source describes the UI ↔ domain
boundary across both workspaces. The spec-018 block stays where it is
(it is `apps/web`-only by intent — the App\* layer does not apply to
`packages/ui`). Alternative: mirror spec 018 and split this rule across
both configs. Pick one.

**Decision B — declaration-only vs reference-ban.** The original gap brief
phrased the rule as "ban the literal identifier unless the surrounding
statement is an `ImportDeclaration` from `@sorrel/domain`." Taken literally
that would forbid the picker from **calling**
`buildMonthView(...)` after importing it, which is exactly what the
centerpiece does. The proposal: target **declarations** only
(`VariableDeclarator`, `FunctionDeclaration`, `ClassDeclaration` with
`id.name` matching). That makes
"`const BLOCKED_WEEKDAY_INDEXES = ...`" a lint error while leaving
"`buildMonthView(year, month, opts)`" untouched. Alternative: target every
`Identifier` and explicitly whitelist via `ImportDeclaration` parent — more
selectors, more false-positive risk. Pick the declaration-only path or push
back.

**Decision C — the `DeliveryStep.tsx` filename.** The brief references
`apps/web/app/[locale]/wizard/steps/DeliveryStep.tsx`. That file does not
exist on the current tree; the wizard steps live in
`apps/web/app/[locale]/wizard/steps/index.tsx`. The lint glob
`apps/web/**/*.{ts,tsx}` covers the actual file regardless of name, so the
spec does not depend on the filename; just confirming the brief drift so it
is not mistaken for a missing file.

# Analytics

None. ESLint is a pre-commit / CI concern; no runtime funnel events fire.
