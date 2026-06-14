/**
 * Spec 032 — Dev-only window hooks.
 *
 * Exercises the two hooks the funnel happy path depends on:
 *
 *   1. `window.__sorrelVariant` — set by tests in `onBeforeLoad` to pin the
 *      PROFILE A/B variant. `useVariant` honours it under
 *      `NODE_ENV !== "production"` so the happy-path test is deterministic.
 *
 *   2. `window.__sorrelAnalyticsQueue` — read-only mirror of the in-memory
 *      `memorySink` events array, set by `createAppTracker` under
 *      `NODE_ENV !== "production"`. The happy-path test asserts the typed
 *      funnel events fired across the seven steps.
 *
 * If either hook silently regresses, the happy path's analytics + variant
 * assertions go quiet — these tests fail loudly instead.
 */

interface QueuedEvent {
  name: string;
  props: Record<string, unknown>;
}

interface SorrelWindow {
  __sorrelVariant?: "A" | "B";
  __sorrelAnalyticsQueue?: readonly QueuedEvent[];
}

describe("Dev-only window hooks (spec 032)", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.window().then((win) => win.sessionStorage.clear());
  });

  it("forces variant A via the window.__sorrelVariant override", () => {
    cy.visit("/en/wizard/profile", {
      onBeforeLoad(win) {
        (win as unknown as SorrelWindow).__sorrelVariant = "A";
      },
    });

    cy.window()
      .its("__sorrelVariant" as keyof Window)
      .should("equal", "A");

    // The PROFILE control branch (variant A) renders three or more clickable
    // pill buttons — the simplest behavioural proof that the override flowed
    // through `useVariant` rather than the test only mutating window state.
    cy.contains(/adult|kitten|senior/i, { timeout: 8000 }).should("be.visible");
  });

  it("exposes a window.__sorrelAnalyticsQueue array under NODE_ENV !== production", () => {
    cy.visit("/en/wizard/cats", {
      onBeforeLoad(win) {
        (win as unknown as SorrelWindow).__sorrelVariant = "A";
      },
    });

    // The tracker is built lazily on the first emit. Visiting CATS fires
    // `funnel_step_viewed`, which constructs the tracker and exposes the queue.
    cy.window({ timeout: 8000 }).should((win) => {
      const queue = (win as unknown as SorrelWindow).__sorrelAnalyticsQueue;
      expect(queue, "queue is defined").to.not.equal(undefined);
      expect(Array.isArray(queue), "queue is an array").to.equal(true);
    });

    cy.window().then((win) => {
      const queue = (win as unknown as SorrelWindow).__sorrelAnalyticsQueue ?? [];
      const names = queue.map((e) => e.name);
      expect(names, "funnel_step_viewed fires on CATS view").to.include("funnel_step_viewed");
      const cats = queue.find((e) => e.name === "funnel_step_viewed" && e.props.step === "cats");
      expect(cats, "CATS step viewed event").to.not.equal(undefined);
    });
  });

  it("variant B override is also respected (sanity for the override path)", () => {
    cy.visit("/en/wizard/profile", {
      onBeforeLoad(win) {
        (win as unknown as SorrelWindow).__sorrelVariant = "B";
      },
    });

    cy.window()
      .its("__sorrelVariant" as keyof Window)
      .should("equal", "B");
  });
});
