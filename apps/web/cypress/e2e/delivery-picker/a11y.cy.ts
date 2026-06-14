/**
 * Spec 032 — DeliveryDatePicker a11y in a real browser (catalog rows
 * C-01, C-03, C-04, C-07). The rows that ride spec 025 (C-02, C-05, C-06)
 * land alongside that spec's implementation, not here.
 */

describe("DeliveryDatePicker — a11y in a real browser", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clock(new Date("2026-06-12T09:00:00Z"));
  });

  it("C-01 — Tab focus-trap never escapes the dialog", () => {
    cy.openDeliveryPicker();
    cy.get('[role="dialog"]').as("dialog");

    // 20 Tab presses should never let activeElement leave the dialog subtree.
    for (let i = 0; i < 20; i += 1) {
      cy.realPressOrTab();
    }
    cy.focused().then(($el) => {
      cy.get("@dialog").then(($dialog) => {
        expect($dialog[0].contains($el[0])).to.equal(true);
      });
    });
  });

  it("C-03 — Arrow keys move document.activeElement through the grid", () => {
    cy.openDeliveryPicker();
    // Active starts on earliest = Mon 15. ArrowRight×2 → Wed 17 (deliverable).
    cy.get('[role="gridcell"][aria-selected="true"]').focus();
    cy.focused().trigger("keydown", { key: "ArrowRight" });
    cy.focused().trigger("keydown", { key: "ArrowRight" });
    cy.focused().should("have.text", "17");
  });

  it("C-04 — exactly one .sdp-cell has tabIndex === 0 at any time", () => {
    cy.openDeliveryPicker();
    cy.get(".sdp-cell").then(($cells) => {
      const focusable = Array.from($cells).filter((el) => el.tabIndex === 0);
      expect(focusable).to.have.length(1);
    });

    // After arrow navigation, still exactly one.
    cy.get('[role="gridcell"][aria-selected="true"]').focus();
    cy.focused().trigger("keydown", { key: "ArrowDown" });
    cy.get(".sdp-cell").then(($cells) => {
      const focusable = Array.from($cells).filter((el) => el.tabIndex === 0);
      expect(focusable).to.have.length(1);
    });
  });

  it("C-07 — backdrop click leaves no zombie .sdp-modal node", () => {
    cy.openDeliveryPicker();
    cy.get(".sdp-backdrop").click({ force: true });
    // Wait past the exit animation (180 ms) + safety net.
    cy.tick(400);
    cy.get(".sdp-modal").should("not.exist");
    cy.get(".sdp-backdrop").should("not.exist");
  });
});

// Shim for the Tab key — Cypress' native `cy.tab()` lives in a separate plugin;
// trigger a Tab keydown on the focused element to simulate it.
Cypress.Commands.add("realPressOrTab" as never, () => {
  cy.focused().trigger("keydown", { key: "Tab" });
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      realPressOrTab(): Chainable<void>;
    }
  }
}

export {};
