/**
 * Spec 044 — Exit-intent modal (spec 010 / spec 022).
 *
 * Verifies that:
 *   1. A `mouseleave` event on `document` with `clientY: 0` arms the trigger,
 *      the ExitIntentModal opens, and an `exit_intent_shown` event fires.
 *   2. Clicking "Leave for now" closes the modal.
 *
 * The exit-intent trigger is implemented in `useExitIntent.ts`: a `mouseleave`
 * listener on `document` that fires when `clientY <= 0`. WizardChrome wires it
 * via `ExitIntentController` (armed when not on SUMMARY and not null).
 *
 * Trigger mechanism: `cy.document().trigger("mouseleave", { clientY: 0 })`.
 * This fires a synthetic DOM event — the hook's addEventListener picks it up
 * because Cypress dispatches to the real document object.
 *
 * The session-once guard (`sessionStorage`) is cleared in beforeEach so the
 * trigger re-arms on each test run.
 */

interface QueuedEvent {
  name: string;
  step?: string;
  variant?: string;
}

describe("Exit-intent modal (spec 010 / spec 044)", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.window().then((win) => win.sessionStorage.clear());
    cy.clock(new Date("2026-06-12T09:00:00Z"), ["Date"]);
    cy.setCookie("sorrel_e2e_today", "2026-06-12");
  });

  it("opens the exit-intent modal when the cursor leaves toward the browser chrome", () => {
    cy.visit("/en/wizard/cats", {
      onBeforeLoad(win) {
        (win as unknown as { __sorrelVariant: "A" }).__sorrelVariant = "A";
      },
    });

    // Wait for the CATS step to be ready.
    cy.location("pathname").should("include", "/wizard/cats");

    // Fire a synthetic mouseleave with clientY: 0 on document.
    // The useExitIntent hook listens on `document` via addEventListener, so
    // a Cypress-dispatched event reaches it directly.
    cy.document().trigger("mouseleave", { clientY: 0 });

    // The ExitIntentModal should open — it renders an AppDialog whose title
    // comes from the "ExitIntent.title" i18n key. Assert on the dialog role.
    cy.get('[role="dialog"]', { timeout: 6000 }).should("be.visible");
  });

  it("fires the exit_intent_shown typed event when the modal opens", () => {
    cy.visit("/en/wizard/cats", {
      onBeforeLoad(win) {
        (win as unknown as { __sorrelVariant: "A" }).__sorrelVariant = "A";
      },
    });

    cy.location("pathname").should("include", "/wizard/cats");
    cy.document().trigger("mouseleave", { clientY: 0 });

    // Wait for the dialog to appear (confirms the trigger fired).
    cy.get('[role="dialog"]', { timeout: 6000 }).should("be.visible");

    // Assert the typed event landed in the in-memory analytics queue
    // (exposed by createAppTracker in NODE_ENV !== "production").
    cy.window().then((win) => {
      const queue =
        (win as unknown as { __sorrelAnalyticsQueue?: QueuedEvent[] }).__sorrelAnalyticsQueue ?? [];
      const shown = queue.filter((e) => e.name === "exit_intent_shown" && e.step === "CATS");
      expect(shown, "exit_intent_shown fires once with step=CATS").to.have.length(1);
    });
  });

  it("closes the modal when the user clicks Leave for now", () => {
    cy.visit("/en/wizard/cats", {
      onBeforeLoad(win) {
        (win as unknown as { __sorrelVariant: "A" }).__sorrelVariant = "A";
      },
    });

    cy.location("pathname").should("include", "/wizard/cats");
    cy.document().trigger("mouseleave", { clientY: 0 });
    cy.get('[role="dialog"]', { timeout: 6000 }).should("be.visible");

    // "Leave for now" is the en translation of ExitIntent.leave
    // (messages/en.json: "leave": "Leave for now").
    cy.contains("button", /leave for now/i).click();

    // Dialog should no longer be visible.
    cy.get('[role="dialog"]').should("not.exist");
  });

  it("session-once guard: second mouseleave does NOT reopen the modal", () => {
    cy.visit("/en/wizard/cats", {
      onBeforeLoad(win) {
        (win as unknown as { __sorrelVariant: "A" }).__sorrelVariant = "A";
      },
    });

    cy.location("pathname").should("include", "/wizard/cats");

    // First trigger — modal opens.
    cy.document().trigger("mouseleave", { clientY: 0 });
    cy.get('[role="dialog"]', { timeout: 6000 }).should("be.visible");

    // Close via Leave button.
    cy.contains("button", /leave for now/i).click();
    cy.get('[role="dialog"]').should("not.exist");

    // Second mouseleave — the session key is set, so the hook removes its
    // listener after the first fire. No second dialog should appear.
    cy.document().trigger("mouseleave", { clientY: 0 });
    // Give React a tick to process any state update.
    cy.wait(200);
    cy.get('[role="dialog"]').should("not.exist");
  });
});
