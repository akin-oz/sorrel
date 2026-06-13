---
spec: 019
title: Funnel desktop layout + nav parity with the design handoff
status: proposed
approved: yes
tier: 1
owner: apps/web
---

# Problem / gap

Re-validated against the Claude design handoff (`Sorrel Funnel Desktop.dc.html`,
`Sorrel Landing.dc.html`). Three parity gaps:

1. **Desktop funnel is missing.** The handoff's desktop funnel is a **1120px two-column**
   layout — `grid-template-columns: 420px 1fr`: the wizard card on the left, a contextual
   **rail** on the right (and on the PLAN step the rail is a **live order summary**). The impl
   (`WizardChrome`) renders only the 420px card at every breakpoint, so desktop is a lonely
   card on a wide empty page.
2. **Landing has no locale picker.** The handoff nav has a "Lang" EN/DE picker (mobile +
   desktop); the impl `SiteNav` has only the logo + CTA. (`LocaleSwitcher` exists — it's only
   wired into the wizard chrome.)
3. **Logo doesn't return home.** The `SiteNav` logo is a plain `<Box>` and the `WizardChrome`
   "Sorrel" wordmark is a plain `<Typography>` — neither links to `/`, so clicking the brand
   does nothing.

# Scope

## Desktop funnel (WizardChrome)

- At `md`+ render the handoff's two-column shell: a centered **1120px** max container,
  `420px 1fr`. Left column = the existing wizard card (unchanged). Right column = a **rail**.
- New `WizardRail` component (fed by funnel state): per the handoff, supporting context per
  step; on **PLAN/SUMMARY** it is the **live order summary** (cats, recipes, delivery date,
  frequency, the server price). Reuse the existing `FunnelDraftByIdDocument` plan data so the
  rail price matches PLAN/SUMMARY. Exact rail copy/structure per the design HTML.
- Mobile (`xs`) is unchanged — single 420px card, no rail.

## Landing nav parity (SiteNav)

- Add the EN/DE locale picker to `SiteNav` (reuse the existing `LocaleSwitcher`, or a shared
  variant), positioned per the handoff nav.
- Logo (BrandLogo + "Sorrel") becomes a link to `/` (localized `Link`).

## Logo → home (WizardChrome)

- The chrome's "Sorrel" wordmark becomes a link to `/` (localized `Link`), keyboard-operable
  with an accessible name.

# Contract impact

None. Presentation + a read of the existing `FunnelDraft.plan` (spec 013) for the rail.
No schema, no new mutation.

# Out of scope

- Restyle/redesign beyond matching the handoff.
- The App\* UI layer migration (spec 018) — if 018 lands first, build these on `App*`; if this
  lands first, 018's migration absorbs the new components. Either order works.
- Form validation — spec 020.

# New dependencies

None.

# Acceptance criteria

- [ ] Desktop (`md`+) funnel renders the 1120px `420px 1fr` two-column with the rail; PLAN +
      SUMMARY rails show the live order summary with the **server** price
- [ ] Mobile funnel unchanged (single 420px card)
- [ ] Landing `SiteNav` shows the EN/DE locale picker (en + de) and the logo links to `/`
- [ ] The wizard wordmark links to `/` and is keyboard-operable with an accessible name
- [ ] `yarn type-check` + `yarn lint` + `next build` green; existing tests stay green
- [ ] Screenshot parity vs the handoff: desktop funnel (a wizard step + PLAN) and landing nav
- [ ] No real-brand names/assets

# Analytics

None (navigation/layout). Existing funnel events are unaffected.
