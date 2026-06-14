/**
 * Spec 032 — Cypress custom commands.
 *
 * The picker / wizard commands wrap the most-repeated test gestures so each
 * `cy.openDeliveryPicker()` or `cy.setReducedMotion()` call documents intent
 * without leaking implementation detail into the specs.
 */

declare global {
  namespace Cypress {
    interface Chainable {
      /** Visit /en/wizard/delivery, click Change, wait for the open dialog. */
      openDeliveryPicker(): Chainable<JQuery<HTMLElement>>;
      /** Force `prefers-reduced-motion: reduce` via the CDP. */
      setReducedMotion(reduce?: boolean): Chainable<void>;
    }
  }
}

Cypress.Commands.add("openDeliveryPicker", () => {
  cy.visit("/en/wizard/delivery");
  cy.contains("button", /change/i).click();
  return cy.get('[role="dialog"]').should("be.visible");
});

Cypress.Commands.add("setReducedMotion", (reduce = true) => {
  // Spec 029's Cypress rows consume this. CDP-level media emulation is the
  // only way to truthfully toggle prefers-reduced-motion in Chromium.
  cy.wrap(
    Cypress.automation("remote:debugger:protocol", {
      command: "Emulation.setEmulatedMedia",
      params: {
        features: [{ name: "prefers-reduced-motion", value: reduce ? "reduce" : "no-preference" }],
      },
    }),
    { log: false },
  );
});

export {};
