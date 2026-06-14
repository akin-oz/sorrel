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

  it("C-24 — TZ matrix: TZ from process.env yields the same earliest deliverable", () => {
    // The host TZ is exposed via Cypress.env('TZ') by cypress.config.ts. The
    // picker uses UTC-only arithmetic, so the closed-card day must be 15
    // (the design's earliest deliverable from today = 2026-06-12) under both
    // TZ=America/Los_Angeles and TZ=Asia/Tokyo. Invoke this spec twice from
    // CI:
    //   TZ=America/Los_Angeles yarn cypress:run --spec ...correctness.cy.ts
    //   TZ=Asia/Tokyo          yarn cypress:run --spec ...correctness.cy.ts
    const tz = Cypress.env("TZ") ?? "UTC";
    cy.visit("/en/wizard/delivery");
    cy.contains("15", { matchCase: false }).should("be.visible");
    cy.log(`TZ exercised: ${tz}`);
  });
});
