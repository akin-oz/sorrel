/**
 * Spec 032 — Funnel happy path.
 *
 * One deterministic CATS → SUMMARY walk under variant A. Asserts URL
 * transitions, no error states, the assembled SUMMARY copy, and that the
 * typed funnel events from `@sorrel/analytics` fired exactly once per step
 * (per spec 009 + spec 032's analytics section).
 *
 * Pre-conditions:
 *  - `cy.clearLocalStorage()` defeats the spec-010 resume banner.
 *  - `cy.clock(...)` fixes "today" so the picker's earliest deliverable
 *    arithmetic is deterministic.
 *  - `window.__sorrelVariant = "A"` pins the PROFILE A/B variant — the dev
 *    override in `useVariant` honours it under NODE_ENV !== "production".
 */

// Steps match the FunnelStep enum in @sorrel/shared (uppercase).
const STEPS = ["CATS", "PROFILE", "RECIPES", "DELIVERY", "PLAN", "EMAIL", "SUMMARY"];

interface QueuedEvent {
  name: string;
  step?: string;
  variant?: string;
  field?: string;
  error?: string;
}

describe("Funnel happy path", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.window().then((win) => win.sessionStorage.clear());
    cy.clock(new Date("2026-06-12T09:00:00Z"));
    // Spec 034: pin the SSR `today` (the server-computed value the picker
    // hydrates against). `cy.clock` only stubs the browser; the cookie is
    // how the dev-mode page reads a deterministic date for tests.
    cy.setCookie("sorrel_e2e_today", "2026-06-12");
  });

  it("completes CATS → SUMMARY under variant A", () => {
    cy.visit("/en/wizard/cats", {
      onBeforeLoad(win) {
        // Force PROFILE variant A before any client React runs.
        (win as unknown as { __sorrelVariant: "A" }).__sorrelVariant = "A";
      },
    });

    // The chrome's Continue button is always called "Continue" except on the
    // last step ("Confirm plan"). Helper to advance past the current step.
    const clickContinue = () =>
      cy
        .contains("button", /^Continue$/)
        .should("not.be.disabled")
        .click();

    // 1 — CATS
    cy.location("pathname").should("include", "/wizard/cats");
    // Each AppToggleOption carries its plural-aware aria-label ("1 cat" / "2 cats" / …).
    cy.get('button[aria-label="2 cats"]').click();
    clickContinue();

    // 2 — PROFILE (variant A, the control). The skeleton resolves once
    // useVariant settles via the window-override microtask.
    cy.location("pathname").should("include", "/wizard/profile");
    cy.get('input[name="name"], input[type="text"]').first().type("Whiskers");
    // Age pill "3–7 years" (key=adult). Weight pill "4–5 kg" (key=m).
    cy.contains("button", "3–7 years").click();
    cy.contains("button", "4–5 kg").click();
    clickContinue();

    // 3 — RECIPES — each card has an "Add" button.
    cy.location("pathname").should("include", "/wizard/recipes");
    cy.contains("button", /^Add$/).first().click();
    cy.contains("button", /^Added$/, { timeout: 6000 }).should("exist");
    clickContinue();

    // 4 — DELIVERY (the picker centerpiece).
    cy.location("pathname").should("include", "/wizard/delivery");
    cy.contains("button", /change/i).click();
    cy.get('[role="dialog"]').should("be.visible");
    cy.get('[role="gridcell"]').contains(/^17$/).click();
    cy.contains("button", /^Confirm$/).click();
    clickContinue();

    // 5 — PLAN
    cy.location("pathname").should("include", "/wizard/plan");
    clickContinue();

    // 6 — EMAIL (server action). The form's own "Save my plan" submit
    // commits the email to wizard state; only THEN does the chrome's
    // Continue ungate to advance to SUMMARY.
    cy.location("pathname").should("include", "/wizard/email");
    cy.get('input[type="email"]').type("test@example.com");
    cy.contains("button", "Save my plan").click();
    cy.contains(/saved|check your inbox/i, { timeout: 8000 }).should("be.visible");
    clickContinue();

    // 7 — SUMMARY renders the assembled rows from `orderSummaryRows`.
    //
    // Even though CATS was picked as "2 cats", PROFILE's `SET_CAT` reducer
    // (`apps/web/app/[locale]/wizard/state.ts`) intentionally collapses
    // `state.cats` to a single-entry array (the lean-funnel design — PROFILE
    // only collects info for the first cat). So SUMMARY paints "1 cat" no
    // matter what was picked in CATS. The plan computation still uses the
    // count from CATS for portion math, but the rendered SUMMARY row reads
    // the *current* length. We assert what the page paints, not what was
    // initially picked.
    cy.location("pathname").should("include", "/wizard/summary");
    cy.contains(/1 cat\b/i, { timeout: 8000 }).should("exist");
    cy.contains(/Wednesday 17 June/).should("exist");
    cy.contains(/test@example\.com/i).should("exist");

    // Typed funnel-event assertions — read the in-memory queue exposed by
    // `apps/web/app/[locale]/wizard/analytics.ts` (NODE_ENV !== "production").
    // Per `@sorrel/analytics`, each FunnelEvent has `step` as a top-level
    // discriminated-union prop, not nested under `.props`.
    cy.window().then((win) => {
      const queue =
        (win as unknown as { __sorrelAnalyticsQueue?: QueuedEvent[] }).__sorrelAnalyticsQueue ?? [];

      const viewed = queue.filter((e) => e.name === "funnel_step_viewed").map((e) => e.step);
      const completed = queue.filter((e) => e.name === "step_completed").map((e) => e.step);

      expect(viewed, "funnel_step_viewed per step").to.deep.equal(STEPS);
      // SUMMARY is the final step — the test stops at reading SUMMARY copy
      // without clicking "Confirm plan", so step_completed fires for the
      // first six only.
      expect(completed, "step_completed for CATS…EMAIL").to.deep.equal(STEPS.slice(0, 6));

      const profileCompleted = queue.find(
        (e) => e.name === "step_completed" && e.step === "PROFILE",
      );
      expect(profileCompleted?.variant, "PROFILE step carries variant: A").to.equal("A");

      expect(
        queue.filter((e) => e.name === "field_error"),
        "no field_error on the happy path",
      ).to.have.length(0);
      expect(
        queue.filter((e) => e.name === "funnel_abandoned"),
        "no funnel_abandoned on the happy path",
      ).to.have.length(0);
      expect(
        queue.filter((e) => e.name === "exit_intent_shown"),
        "no exit_intent_shown on the happy path",
      ).to.have.length(0);
    });
  });
});
