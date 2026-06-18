---
spec: 052
title: React 19 ref-as-prop on App* interactive components — AppButton, AppField, AppIconButton
status: proposed
approved: yes
tier: 2 # JD coverage — frontend rigor / accessibility plumbing
owner: packages/ui/src/app/components.tsx
---

# Problem / gap

The semantic App\* wrapper components (`AppButton`, `AppField`, `AppIconButton`) in
`packages/ui/src/app/components.tsx` are plain function components that destructure
their own props and spread `...props` onto the underlying MUI element. None of them
accept a `ref`. The wrapper signatures are:

- `AppButton({ inverted, ...props }: AppButtonProps)` → `<Button …>`
- `AppIconButton(props: AppIconButtonProps)` → `<IconButton …>`
- `AppField({ options, children, ...props }: AppFieldProps)` → `<TextField …>`

Because these are not `forwardRef` components and do not declare `ref` as a prop, a
caller that passes `ref` gets it silently dropped — React does not forward `ref`
through an ordinary function component, and in TypeScript the `ref` prop is not even
part of the component's props type, so a caller cannot attach one. Any
focus-management `useEffect` in `apps/web` (or imperative `.focus()` from a parent)
therefore has no handle on the rendered DOM node.

A concrete affected call site exists today: `apps/web/app/[locale]/wizard/ExitIntentModal.tsx`
renders the "keep going" recovery CTA as `<AppButton onClick={onRecover} …>`. There is
currently no way to move initial focus onto that button when the modal opens, because
`AppButton` exposes no `ref`. The principal-review staff-frontend reviewer flagged this
as **P2**: "Without this, programmatic focus silently fails."

No existing approved spec covers this. Spec 018 (`specs/018-app-ui-layer.md`) defined the
App\* layer's intent-prop API but did not address `ref` forwarding. Specs 010/022/051
build the wizard and its recovery flows on top of these components but assume the
primitives behave like normal focusable elements.

The underlying MUI components (`Button`, `IconButton`, `TextField`) already accept and
forward `ref` to their root DOM nodes. The only missing link is the App\* wrappers
passing `ref` through. The repo is on React 19 (`packages/ui` declares
`react ^19.0.0` as a peer and resolves `react ^19.2.4`), where `ref` is a regular
prop and `forwardRef` is no longer required.

# Scope

Single file: `packages/ui/src/app/components.tsx`.

Three components, each gains a `ref` parameter forwarded to the wrapped MUI element.
The exact change pattern (React 19 ref-as-prop, no `forwardRef` wrapper):

- **`AppButton`** — destructure `ref` alongside `inverted` and pass it to `<Button ref={ref} …>`.
  Ref element type is the MUI Button root (an `HTMLButtonElement` by default).
- **`AppIconButton`** — accept `ref` and pass it to `<IconButton ref={ref} …>`
  (`HTMLButtonElement`).
- **`AppField`** — destructure `ref` alongside `options`/`children` and pass it to
  `<TextField ref={ref} …>`. MUI `TextField` forwards `ref` to its outer `FormControl`
  root element; the existing `inputRef` prop (for the input node) is unchanged and out
  of scope here.

Prop types: the `ref` prop type should be sourced from the existing MUI prop types
already imported in the file (`ButtonProps`, `IconButtonProps`, `TextFieldProps`),
which each include a `ref` member — i.e. reuse the MUI-declared `ref` type rather than
hand-authoring an element type. The `Omit<…, "sx">` exclusions on `AppButtonProps`,
`AppIconButtonProps`, and `AppFieldProps` must continue to exclude only `"sx"`; `ref`
must remain part of each props type so callers can pass it and TypeScript accepts it.

No other App\* components are touched. No call sites in `apps/web` are modified by this
spec (see Out of scope).

Analytics events touched: none.

# Contract impact

None. This does not change `schema.graphql` and does not touch `packages/domain`. No
GraphQL operation, generated type, or domain invariant is affected. The change is
purely additive to the component prop surface (`ref` becomes accepted where it was
previously dropped); existing callers that pass no `ref` compile and render identically.

# Out of scope

- **No new call sites.** Wiring `ref` + a focus `useEffect` into `ExitIntentModal.tsx`
  (or any other consumer) is NOT part of this spec. This spec only makes `ref` available
  on the primitives; consuming it is a separate, later change. The reviewer's
  `ExitIntentModal` example is cited only to justify the gap, not to authorize editing it.
- **No `forwardRef` migration of other components.** `AppLink`, `AppCard`, `AppChip`,
  `AppAlert`, `AppSkeleton`, `AppToggleGroup`, `AppToggleOption`, `AppDialog`, etc. are
  unchanged. If they later need refs, that is a separate proposal.
- **No `inputRef` / inner-input ref API** for `AppField` beyond MUI's existing default
  behaviour. We forward the root `ref` only; `inputRef` already passes through via
  `...props` and is not being re-specified.
- **No styling, behaviour, accessibility-semantics, or default-prop changes** to any of
  the three components.
- **No new dependencies** added to any `package.json`.

# Acceptance criteria

- [ ] `AppButton`, `AppIconButton`, and `AppField` each accept a `ref` prop and forward
      it to the underlying MUI `Button` / `IconButton` / `TextField`.
- [ ] The `ref` prop type is derived from the corresponding MUI props type already
      imported in the file (no hand-written element type, no new import beyond what exists).
- [ ] No `forwardRef` wrapper is introduced (React 19 ref-as-prop pattern only).
- [ ] Callers that pass no `ref` are unchanged at runtime and at the type level — no
      existing `apps/web` or `packages/ui` call site needs edits to keep compiling.
- [ ] A typed smoke usage proves a `ref` can be attached and resolves to the rendered
      DOM node (e.g. a unit/Storybook/Vitest-style assertion in `packages/ui`, or a
      type-level test), covering at least `AppButton`.
- [ ] `yarn type-check` green (0 errors/warnings).
- [ ] `yarn lint` green.
- [ ] No change to `schema.graphql`, `packages/domain`, or any analytics contract.

# Analytics

None. This change does not view, complete, error, or abandon any funnel step and fires
no events. `funnel_step_viewed`, `step_completed`, `field_error`, and `funnel_abandoned`
are all unaffected.
