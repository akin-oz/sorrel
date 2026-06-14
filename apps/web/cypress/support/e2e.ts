/**
 * Spec 032 — Cypress support entrypoint.
 *
 * Side-effect import of `cypress-axe` registers `cy.injectAxe` / `cy.checkA11y`
 * on the Cypress chainable. Custom commands live in `./commands`.
 */
import "cypress-axe";

import "./commands";

// Cypress 15+ fails any test where the application throws an uncaught error.
// React 19 raises a hydration-mismatch error and *recovers* on the client when
// SSR output differs from the first client render (e.g. the picker computing
// `today` from `new Date()`, locale/timezone drift in dev). The recovery path
// is correct app behaviour, not a test failure, so we let it through here and
// keep every other uncaught error fatal.
Cypress.on("uncaught:exception", (err) => {
  const msg = err?.message ?? "";
  if (
    msg.includes("Hydration failed") ||
    msg.includes("hydrating") ||
    msg.includes("There was an error while hydrating") ||
    msg.includes("Minified React error #418") ||
    msg.includes("Minified React error #423") ||
    msg.includes("Minified React error #425")
  ) {
    return false;
  }
  return undefined;
});
