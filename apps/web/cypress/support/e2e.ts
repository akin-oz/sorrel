/**
 * Spec 032 — Cypress support entrypoint.
 *
 * Side-effect import of `cypress-axe` registers `cy.injectAxe` / `cy.checkA11y`
 * on the Cypress chainable. Custom commands live in `./commands`.
 */
import "cypress-axe";

import "./commands";
