/**
 * Spec 032 — Cypress support entrypoint.
 *
 * Side-effect import of `cypress-axe` registers `cy.injectAxe` / `cy.checkA11y`
 * on the Cypress chainable. Custom commands live in `./commands`.
 */
import "cypress-axe";

import "./commands";

// Cypress 15+ fails any test where the application throws an uncaught error —
// which is the behaviour we want. There is intentionally NO
// `Cypress.on("uncaught:exception", …)` handler here.
//
// Spec 034 removed the blanket suppressor after fixing the picker's SSR/CSR
// drift at the source (server-computed `today` threaded through the wizard
// page → StepScreen → DeliveryStep). No benign errors remain to allowlist, so
// the band-aid is gone rather than left dormant. If a genuinely benign error
// surfaces later, add a targeted handler that re-throws everything except the
// one matched message — never a blanket `return undefined`.
