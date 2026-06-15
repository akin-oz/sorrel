import { defineConfig } from "cypress";

/**
 * Spec 032 — Cypress bootstrap for the funnel happy path and the
 * delivery-picker real-browser catalog.
 *
 * Fixed-clock seed strategy: tests opt into `cy.clock(new Date(...))` rather
 * than depending on wall time, so the earliest-deliverable arithmetic in the
 * picker is deterministic regardless of when CI runs.
 *
 * TZ-matrix strategy: the host shell sets `TZ=...` before invoking
 *   TZ=America/Los_Angeles yarn cypress:run --spec ...correctness.cy.ts
 *   TZ=Asia/Tokyo          yarn cypress:run --spec ...correctness.cy.ts
 * The Node process inherits TZ from the shell, which is what drives the
 * SSR `today` arithmetic. No `Cypress.env` mirroring is needed (Cypress 15
 * deprecates `allowCypressEnv`-gated browser reads of `Cypress.env`).
 */
export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts",
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    screenshotOnRunFailure: true,
    // Cypress 15 deprecation: opt out of browser-side reads of `Cypress.env`.
    // C-24 in correctness.cy.ts no longer reads it; the TZ matrix is driven
    // by the host shell's `TZ=…` invocation as documented above.
    allowCypressEnv: false,
    // Spec 039 §6: the Stripe PaymentElement renders inside a
    // js.stripe.com iframe. Cypress's default same-origin policy blocks
    // `contentDocument.body` access on cross-origin iframes, which is
    // how we drive `4242 4242 4242 4242` into the form. Disabling this
    // unblocks the iframe traversal. (Stripe's iframes are sandboxed +
    // signed; the lifted check only affects the test runner's view of
    // the page, not what the bundle ships in prod.)
    chromeWebSecurity: false,
  },
});
