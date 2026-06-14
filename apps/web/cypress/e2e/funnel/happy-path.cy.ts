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

const STEPS = ["cats", "profile", "recipes", "delivery", "plan", "email", "summary"];

interface QueuedEvent {
  name: string;
  props: Record<string, unknown>;
}

describe("Funnel happy path", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.window().then((win) => win.sessionStorage.clear());
    cy.clock(new Date("2026-06-12T09:00:00Z"));
  });

  it("completes CATS → SUMMARY under variant A", () => {
    cy.visit("/en/wizard/cats", {
      onBeforeLoad(win) {
        // Force PROFILE variant A before any client React runs.
        (win as unknown as { __sorrelVariant: "A" }).__sorrelVariant = "A";
      },
    });

    // 1 — CATS
    cy.location("pathname").should("include", "/wizard/cats");
    cy.get('[role="alert"]').should("not.exist");
    cy.contains("button", /^2$/).click();
    cy.contains("button", /continue/i).click();

    // 2 — PROFILE
    cy.location("pathname").should("include", "/wizard/profile");
    cy.get('input[name="name"], input[id*="name"]').first().type("Whiskers");
    cy.contains("button", /adult/i).click();
    cy.contains("button", /average/i).click();
    cy.contains("button", /continue/i).click();

    // 3 — RECIPES
    cy.location("pathname").should("include", "/wizard/recipes");
    cy.get('[role="button"], button')
      .contains(/chicken|salmon|turkey/i)
      .first()
      .click();
    cy.contains("button", /continue/i).click();

    // 4 — DELIVERY
    cy.location("pathname").should("include", "/wizard/delivery");
    cy.contains("button", /change/i).click();
    cy.get('[role="dialog"]').should("be.visible");
    cy.get('[role="gridcell"]').contains(/^17$/).click();
    cy.contains("button", /confirm/i).click();
    cy.contains("button", /continue/i).click();

    // 5 — PLAN
    cy.location("pathname").should("include", "/wizard/plan");
    cy.contains("button", /continue/i).click();

    // 6 — EMAIL (server action)
    cy.location("pathname").should("include", "/wizard/email");
    cy.get('input[type="email"]').type("test@example.com");
    cy.contains("button", /continue/i).click();

    // 7 — SUMMARY
    cy.location("pathname").should("include", "/wizard/summary");
    cy.contains(/whiskers/i).should("exist");
    cy.contains(/test@example\.com/i).should("exist");

    // Typed funnel-event assertions — read the in-memory queue exposed by
    // `apps/web/app/[locale]/wizard/analytics.ts` (NODE_ENV !== "production").
    cy.window().then((win) => {
      const queue =
        (win as unknown as { __sorrelAnalyticsQueue?: QueuedEvent[] }).__sorrelAnalyticsQueue ?? [];

      const viewed = queue
        .filter((e) => e.name === "funnel_step_viewed")
        .map((e) => e.props.step as string);
      const completed = queue
        .filter((e) => e.name === "step_completed")
        .map((e) => e.props.step as string);

      expect(viewed, "funnel_step_viewed per step").to.deep.equal(STEPS);
      expect(completed, "step_completed per step").to.deep.equal(STEPS);

      const profileCompleted = queue.find(
        (e) => e.name === "step_completed" && e.props.step === "profile",
      );
      expect(profileCompleted?.props.variant, "PROFILE step carries variant: A").to.equal("A");

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
