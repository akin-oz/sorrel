/**
 * Spec 032 — DeliveryDatePicker correctness in a real browser.
 *
 * Catalog rows in scope: C-23 (DeliveryStep wiring smoke), C-24 (TZ-matrix
 * stability — the same `today` must yield the same picker output under
 * non-UTC host timezones).
 */

describe("DeliveryDatePicker — correctness in a real browser", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clock(new Date("2026-06-12T09:00:00Z"));
    cy.setCookie("sorrel_e2e_today", "2026-06-12"); // spec 034: pin SSR today
  });

  it("C-23 — opening the picker from /wizard/delivery, picking 17, the summary updates", () => {
    cy.visit("/en/wizard/delivery");
    cy.contains("button", /change/i).click();
    cy.get('[role="gridcell"]').contains(/^17$/).click();
    cy.contains("button", /confirm/i).click();
    cy.tick(400);

    // The closed-card day number flips to 17 — proves the picker's onConfirm
    // flowed through `SET_DELIVERY_DATE` and the closed card re-rendered.
    cy.contains("17").should("be.visible");
  });

  it("C-24 — TZ matrix: host TZ yields the same earliest deliverable", () => {
    // The picker uses UTC-only arithmetic, so the closed-card day must be 15
    // (the design's earliest deliverable from today = 2026-06-12) regardless
    // of host TZ. Invoke this spec under different TZ values from the host
    // shell (Cypress 15 deprecated `allowCypressEnv`-gated Cypress.env reads
    // from browser code, so the TZ is driven via the Node process env):
    //   TZ=America/Los_Angeles yarn cypress:run --spec ...correctness.cy.ts
    //   TZ=Asia/Tokyo          yarn cypress:run --spec ...correctness.cy.ts
    cy.visit("/en/wizard/delivery");
    cy.contains("15", { matchCase: false }).should("be.visible");
  });
});
