---
spec: 042
title: Pre-delivery dependency alignment — collapse dual React, force prettier 3 via resolutions, align ESLint + TypeScript majors across workspaces, re-declare MUI + emotion as direct apps/web deps, harmonise @sorrel/domain workspace range + @types/node, loosen react-compiler pin
approved: yes
tier: 2 # JD coverage — pre-delivery dependency robustness
owner: package.json (root + apps/web + packages/ui) · yarn.lock
---

# Problem / gap

The 2026-06-15 delivery-readiness audit (dependency auditor) found seven
independent dependency-hygiene gaps. Two are blockers (a runtime hook-context
split risk from dual React, and a Prettier `.bin` mis-hoist that would
false-fail any future `.bin/prettier`-based lint hook), three are major
(ESLint + TypeScript version splits across workspaces, MUI consumed by
apps/web only via a transitive hoist), and two are minor (workspace-range
hygiene + `@types/node` split + an exact pin on `babel-plugin-react-compiler`).

None has its own spec; they have been treated as ambient risks. They are
small individually and a fresh-clone reproducibility risk collectively.

The seven concrete findings, with severity from the audit:

1. **BLOCKER (Deps-B1) — Dual React installation.** `apps/web/package.json:36-37`
   pins `"react": "19.2.4"` exact. `packages/ui/package.json:22` declares
   `"react": "^19.2.4"` which yarn-classic resolves to `19.2.7` and hoists
   to the root `node_modules`. Confirmed in `yarn.lock` — two distinct
   entries: `react@19.2.4` → 19.2.4 tarball, `react@^19.2.4` → 19.2.7
   tarball. Physically: `node_modules/react` is 19.2.7 (serves
   MUI-from-`packages/ui`); `apps/web/node_modules/react` is 19.2.4 (serves
   the Next app + Next's bundled React). React Contexts (incl. Emotion's
   theme context and MUI's contexts) can be created from one instance and
   consumed from the other — classic duplicate-React hook violation. Same
   major, different patch, two registry locations is not safe.

2. **BLOCKER (Deps-B2) — `.bin/prettier` symlink targets Prettier 2.8.8.**
   `ls -la node_modules/.bin/prettier` resolves to
   `json-schema-to-typescript/node_modules/prettier/bin-prettier.js`,
   which is `prettier@2.8.8`. Root `package.json:41` declares
   `"prettier": "^3.8.4"`, and the root scripts at lines 16-17 dodge the
   symlink by calling `node node_modules/prettier/bin/prettier.cjs`
   directly. The risk: any future tool that resolves `prettier` via PATH
   / `node_modules/.bin/prettier` (editor format-on-save configured to
   the workspace binary; future `lint-staged` or `husky` hook; IDE
   integrations) silently runs Prettier 2 against a v3-configured tree
   and false-reds.

3. **MAJOR (Deps-M2) — ESLint major split.** Root `package.json:37`
   declares `"eslint": "^10.4.1"`. `apps/web/package.json:50` declares
   `"eslint": "^9"`. Two physically distinct ESLint installs (root
   `node_modules/eslint` = 10.4.1; `apps/web/node_modules/eslint` =
   9.39.4). Root `lint` script chains `eslint packages services …` (v10)
   with `yarn workspace @sorrel/frontend lint` (v9) — two engines, one
   `yarn lint`. A rule on-by-default in v10 but off in v9 (or vice
   versa) reds one and greens the other. `eslint-config-next@16.2.9`
   peer is `eslint >=9.0.0` — v10 is fine.

4. **MAJOR (Deps-M3) — TypeScript major split.** Root
   `package.json:45` declares `"typescript": "^6.0.3"`.
   `apps/web/package.json:54` declares `"typescript": "^5"`. Root
   type-check runs TS 6.0.3 (`yarn workspaces run type-check` plus
   `tsc --noEmit -p tsconfig.json` at line 20 of root package.json); the
   apps/web workspace step runs TS 5.9.3. Different narrowing rules,
   different decorator handling. `ts-jest@29` peer `>=4.3 <7` — TS 6
   accepted. `typescript-eslint@8.61` peer `>=4.8.4 <6.1.0` — TS 6.0.3
   is _just_ inside the window with 0.7 minor of headroom.

5. **MAJOR (Deps-M1) — MUI / Emotion consumed by apps/web only via
   transitive hoist.** `apps/web/package.json` has zero `@mui/*` or
   `@emotion/*` entries (lines 20–40). `packages/ui/package.json:17-20`
   declares them. `apps/web/next.config.ts:13-19` lists `@sorrel/ui` in
   `transpilePackages`, so Next compiles `packages/ui` source which
   imports `@mui/material` — yarn-classic hoists to root and Next's
   resolver picks it up from there. ESLint `no-restricted-imports` ban
   in `apps/web/eslint.config.mjs:72-83` blocks direct app-layer
   imports (spec 018) and is currently passing. The fragility: any
   topology change (yarn berry, `hoistingLimits`, dropping the dep from
   `packages/ui`) immediately breaks the apps/web build with no signal
   from its own `package.json`.

6. **MINOR (Deps-N1) — Workspace-range inconsistency on
   `@sorrel/domain`.** `packages/ui/package.json:21` declares
   `"@sorrel/domain": "1.0.0"` (exact). `services/api/package.json`
   declares `"@sorrel/domain": "*"`. The pin works today because
   `packages/domain/package.json` is `"1.0.0"`. The day someone bumps
   `@sorrel/domain` to `1.1.0`, yarn-classic stops resolving the
   `packages/ui` pin to the local workspace.

7. **MINOR (Deps-N2 + Deps-N5) — `@types/node` major split and
   `babel-plugin-react-compiler` exact pin.** Root declares
   `@types/node ^25.9.3`; apps/web declares `^20`. Node 20 types are
   missing API surface present in Node 24 (the engines field already
   targets `>=24`). And `apps/web/package.json:47` pins
   `babel-plugin-react-compiler` to exact `1.0.0` — no semver headroom
   for patch fixes the React compiler ships frequently against React 19.x.

No existing approved spec covers any of these seven items.

# Scope

The exact files this spec touches. No file outside these is edited.

## 1. Collapse dual React

- Edit `apps/web/package.json`:
  - Line 36: `"react": "19.2.4"` → `"react": "^19.2.4"`.
  - Line 37: `"react-dom": "19.2.4"` → `"react-dom": "^19.2.4"`.
- Run `yarn install` to refresh `yarn.lock` so all React consumers
  collapse to a single resolved version (19.2.7).
- Acceptance criterion: `grep -E '^react@' yarn.lock | wc -l` returns
  `1`. Same for `react-dom`.

## 2. Force Prettier 3 via root `resolutions`

- Edit root `package.json`: add a top-level `"resolutions"` block (after
  `devDependencies`, before the closing brace):
  ```json
  "resolutions": {
    "prettier": "^3.8.4"
  }
  ```
- Run `yarn install` to rebuild the lock so every transitive consumer
  (incl. `json-schema-to-typescript`) resolves Prettier 3.
- Acceptance criterion: `readlink node_modules/.bin/prettier` resolves
  to a Prettier 3 binary. `node node_modules/.bin/prettier --version`
  prints `3.x.y`.

## 3. Align ESLint to major 10

- Edit `apps/web/package.json:50`: `"eslint": "^9"` → `"eslint": "^10"`.
- Run `yarn install`. Verify `apps/web/node_modules/eslint` is now
  Prettier-style absent (a single hoisted ESLint at root).
- Acceptance criterion: `grep -E '^eslint@' yarn.lock | wc -l` returns
  `1`. `yarn lint` exits 0.

## 4. Align TypeScript to major 6

- Edit `apps/web/package.json:54`: `"typescript": "^5"` →
  `"typescript": "^6"`.
- Run `yarn install`. The `tsc --version` at the root and inside
  `apps/web` both report `6.x.y`.
- The `typescript-eslint@8.61` peer ceiling (`<6.1.0`) is the cap to
  watch — flagged in the minor section.
- Acceptance criterion: `grep -E '^typescript@' yarn.lock | wc -l`
  returns `1`. `yarn type-check` exits 0.

## 5. Re-declare MUI + Emotion as direct apps/web deps

- Edit `apps/web/package.json` `dependencies` block (current lines
  20–40): add three direct entries that mirror `packages/ui`:
  ```json
  "@mui/material": "^9.1.1",
  "@mui/material-nextjs": "^9.1.1",
  "@emotion/react": "^11.14.0",
  "@emotion/styled": "^11.14.1"
  ```
- The existing ESLint `no-restricted-imports` ban in
  `apps/web/eslint.config.mjs:72-83` stays — it blocks `apps/web` _source
  code_ from importing `@mui/*` / `@emotion/*` directly. The package.json
  declaration ensures the _build resolution_ is robust against topology
  changes (yarn berry, dropping the dep from `packages/ui`, etc.). The
  two layers are not in conflict: the package is declared so resolution
  is stable, and the source-import ban keeps the App* layer the only
  surface that ever touches `@mui/*`.
- Acceptance criterion: `grep -c '@mui' apps/web/package.json` returns
  `>= 2`. `eslint apps/web` still exits 0 — no surviving direct
  `@mui/*` imports in any `apps/web/**/*.{ts,tsx}`.

## 6. Workspace-range hygiene on `@sorrel/domain`

- Edit `packages/ui/package.json:21`: `"@sorrel/domain": "1.0.0"` →
  `"@sorrel/domain": "*"`. Matches the pattern in `services/api`,
  `apps/web`, and `packages/analytics`.
- No other workspace ranges change in this spec.
- Acceptance criterion: `grep -n '"@sorrel/domain"' packages/ui/package.json`
  shows `"*"`, not `"1.0.0"`.

## 7. `@types/node` alignment + react-compiler caret

- Edit `apps/web/package.json`:
  - Line 43: `"@types/node": "^20"` → `"@types/node": "^25"`. Matches
    the root and the actual Node engines target.
  - Line 47: `"babel-plugin-react-compiler": "1.0.0"` →
    `"babel-plugin-react-compiler": "^1.0.0"`. Allows patch upgrades
    without a manual pin bump.
- Run `yarn install`.
- Acceptance criterion: `grep -E '^@types/node@' yarn.lock | wc -l`
  returns `1` (no v20 + v25 split). `apps/web/package.json:47` shows
  the caret.

# Contract impact

None.

- `schema.graphql`: untouched.
- `packages/domain`: untouched.
- `packages/analytics`: untouched.
- `packages/ui`: only the `@sorrel/domain` range changes (§6); no
  runtime behaviour change.
- `apps/web`: `package.json` is rewritten; no source code change. The
  ESLint ban from spec 018 stays the surface guard.
- New dependency declarations under §5: `@mui/material`,
  `@mui/material-nextjs`, `@emotion/react`, `@emotion/styled`. These
  are not new installs — they already resolve transitively today.
  Declaring them direct is a robustness change, not an introduction.
- One new root field under §2: `"resolutions"` with a single Prettier
  entry. yarn-classic supports `resolutions` out of the box.

# Out of scope

- Upgrading `typescript-eslint` past 8.61 to anticipate TS 6.1's
  `<6.1.0` peer-ceiling break. The current pair has 0.7 of a minor of
  headroom; the bump can wait until a `typescript-eslint@^9` ships.
- Migrating to yarn berry (`yarn@4`) or pnpm. The audit's "transitive
  hoist is fragile" finding is mitigated by §5 (direct declarations);
  the toolchain change is a separate decision.
- Dropping the deprecated transitive packages (`glob@7`, `rimraf@2/3`,
  `inflight@1`) by replacing `storyblok-generate-ts`. Out-of-scope
  cleanup; tracked but not in this spec.
- Any source-code change in `apps/web` or `packages/ui`. This spec is
  package.json + yarn.lock only.
- Any change to the spec-018 `no-restricted-imports` ESLint ban. It
  stays as the source-level guard against re-introducing direct MUI
  imports.

# Acceptance criteria

- [ ] `yarn install` from a clean clone (no `node_modules`) produces a
      `yarn.lock` diff and exits 0.
- [ ] `yarn type-check && yarn lint && yarn format:check` — clean (0
      warnings, 0 errors).
- [ ] `yarn workspaces run test` — every workspace's jest suite green.
- [ ] `yarn workspace @sorrel/frontend build` — exits 0; `.next/`
      builds with no missing-module errors.
- [ ] `yarn workspace @sorrel/frontend cypress run` — identical pass
      count to the pre-spec baseline.
- [ ] `grep -E '^react@' yarn.lock | wc -l` returns `1`.
- [ ] `grep -E '^react-dom@' yarn.lock | wc -l` returns `1`.
- [ ] `node_modules/.bin/prettier --version` prints a `3.x.y` value.
- [ ] `grep -E '^eslint@' yarn.lock | wc -l` returns `1`.
- [ ] `grep -E '^typescript@' yarn.lock | wc -l` returns `1`.
- [ ] `grep -E '^@types/node@' yarn.lock | wc -l` returns `1`.
- [ ] `apps/web/package.json` has direct `@mui/material`,
      `@mui/material-nextjs`, `@emotion/react`, `@emotion/styled`
      entries in `dependencies`.
- [ ] `packages/ui/package.json` has `"@sorrel/domain": "*"`.
- [ ] `apps/web/package.json:47` shows `"^1.0.0"` for
      `babel-plugin-react-compiler`.
- [ ] Root `package.json` has a `"resolutions"` block with at minimum
      `"prettier": "^3.8.4"`.
- [ ] A
      `grep -rE "from ['\"]@mui|from ['\"]@emotion" apps/web/app apps/web/lib`
      returns zero hits (the spec-018 ban still holds).
- [ ] No `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or
      `ignoreDeprecations` added anywhere in the diff.
- [ ] The implementation commit subject(s) include the `Spec: 042`
      trailer (canonical form).

# Analytics

None. This spec touches dependency declarations and lockfile resolutions
only; no typed funnel events change, no `packages/analytics` change,
no spec-009 surface change.
