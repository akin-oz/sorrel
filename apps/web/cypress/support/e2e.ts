/**
 * Spec 032 — Cypress support entrypoint.
 *
 * Side-effect import of `cypress-axe` registers `cy.injectAxe` / `cy.checkA11y`
 * on the Cypress chainable. Custom commands live in `./commands`.
 */
import "cypress-axe";

import "./commands";

// Cypress 15+ fails any test where the application throws an uncaught error.
// The handler scaffold is kept so future justified suppressions have one
// reviewable place to live with a comment explaining each one.
// No suppressions; spec 034 removed the hydration band-aid after fixing the
// picker's SSR/CSR drift at the source (server-computed `today` threaded
// through the wizard page → StepScreen → DeliveryStep).
Cypress.on("uncaught:exception", () => {
  return undefined;
});
