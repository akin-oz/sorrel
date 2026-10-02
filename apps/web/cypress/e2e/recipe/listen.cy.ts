/**
 * Spec 053 — "Listen" read-aloud on the recipe page.
 *
 * `/api/tts` is intercepted with a 1-second silent mp3 fixture, so the run never
 * reaches the route handler, let alone ElevenLabs. A catch-all intercept on the
 * vendor host fails the test if anything tries to call it directly.
 */

interface QueuedEvent {
  name: string;
  content_id?: string;
  chars?: number;
}

const queue = (win: Window) =>
  (win as unknown as { __sorrelAnalyticsQueue?: QueuedEvent[] }).__sorrelAnalyticsQueue ?? [];

describe("Recipe Listen button (spec 053)", () => {
  it("plays fixture audio, announces state, and fires tts events", () => {
    cy.intercept("https://api.elevenlabs.io/**", () => {
      throw new Error("Tests must never call the real ElevenLabs API");
    });
    cy.intercept("POST", "/api/tts", {
      statusCode: 200,
      fixture: "tts-sample.mp3,null",
      headers: { "content-type": "audio/mpeg" },
    }).as("tts");

    cy.visit("/en/recipes/wild-caught-salmon");

    cy.get("[data-testid=listen-button]").should("have.attr", "aria-label", "Listen").click();

    cy.wait("@tts").its("request.body.text").should("be.a", "string").and("not.be.empty");
    cy.get("[role=status]").should("contain.text", "Playing");
    cy.get("[data-testid=listen-button]").should("have.attr", "data-status", "playing");

    // The fixture is 1 s long — playback ends and the button resets.
    cy.get("[role=status]", { timeout: 5000 }).should("contain.text", "Finished");
    cy.get("[data-testid=listen-button]").should("have.attr", "data-status", "idle");

    cy.window().should((win) => {
      const names = queue(win).map((event) => event.name);
      expect(names).to.include("tts_play");
      expect(names).to.include("tts_ended");
      const play = queue(win).find((event) => event.name === "tts_play");
      expect(play?.content_id).to.equal("wild-caught-salmon");
    });
  });

  it("is reachable from the landing showcase (spec 055)", () => {
    cy.visit("/en");
    cy.get("#recipes a[href*='/recipes/']").first().as("cardLink");
    cy.get("@cardLink")
      .invoke("attr", "href")
      .should("match", /\/recipes\/[a-z0-9-]+$/);
    cy.get("@cardLink").click();
    cy.location("pathname").should("match", /\/recipes\/[a-z0-9-]+$/);
    cy.get("[data-testid=listen-button]").should("be.visible");
  });

  it("shows the retry state on a rate-limited response", () => {
    cy.intercept("POST", "/api/tts", { statusCode: 429, body: { error: "rate_limited" } }).as(
      "tts",
    );

    cy.visit("/en/recipes/wild-caught-salmon");
    cy.get("[data-testid=listen-button]").click();
    cy.wait("@tts");
    cy.get("[data-testid=listen-button]").should("have.attr", "aria-label", "Retry");
    cy.get("[role=status]").should("contain.text", "Audio unavailable");
    cy.window().should((win) => {
      expect(queue(win).map((event) => event.name)).to.include("tts_error");
    });
  });
});
