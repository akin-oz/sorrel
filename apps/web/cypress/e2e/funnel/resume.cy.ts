/**
 * Spec 044 — Resume-from-draft (HYDRATE path).
 *
 * Verifies that when a partial funnel state is present in localStorage under
 * `sorrel.funnel.v1` (the STORAGE_KEY in FunnelProvider.tsx), the FunnelProvider
 * dispatches HYDRATE on mount and the ResumeBanner renders on the CATS step —
 * signalling that the user can resume where they left off.
 *
 * The STORAGE_KEY and HYDRATE action are the two implementation anchors:
 *   - STORAGE_KEY: "sorrel.funnel.v1"  (FunnelProvider.tsx:31)
 *   - HYDRATE action: parsed from localStorage in a useEffect on mount
 *   - ResumeBanner: visible on CATS when `state.furthestStep !== "CATS"`
 *     and `currentStep === "CATS"` (ResumeBanner.tsx:20)
 *
 * Pre-conditions match happy-path.cy.ts: clock, today cookie, variant A.
 * Additionally we seed localStorage before navigation so the HYDRATE fires
 * on the first render.
 */

const STORAGE_KEY = "sorrel.funnel.v1";

describe("Funnel resume-from-draft (HYDRATE path)", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.window().then((win) => win.sessionStorage.clear());
    cy.clock(new Date("2026-06-12T09:00:00Z"), ["Date"]);
    cy.setCookie("sorrel_e2e_today", "2026-06-12");
  });

  it("shows ResumeBanner on CATS when localStorage contains a partial draft", () => {
    // Seed localStorage with a draft that has progressed past CATS.
    // The HYDRATE reducer merges this into the initial state on mount.
    const partialDraft = {
      cats: [{ name: "Mochi", age: "3–7 years", weight: "4–5 kg" }],
      recipeSlugs: ["chicken-feast"],
      deliveryDate: "2026-06-15",
      frequency: null,
      email: null,
      furthestStep: "DELIVERY",
    };

    cy.visit("/en/wizard/cats", {
      onBeforeLoad(win) {
        (win as unknown as { __sorrelVariant: "A" }).__sorrelVariant = "A";
        win.localStorage.setItem(STORAGE_KEY, JSON.stringify(partialDraft));
      },
    });

    // ResumeBanner renders when currentStep === "CATS" and
    // state.furthestStep !== "CATS". The banner contains the "resume"
    // translation key which renders as the resume CTA button.
    // Both the mobile (main card) and desktop (rail) slots render it — the
    // mobile one is the one inside <main> (AppBox display xs:block md:none).
    cy.get("button")
      .contains(/resume/i, { timeout: 8000 })
      .should("be.visible");
  });

  it("resume CTA navigates to the furthestStep (DELIVERY)", () => {
    const partialDraft = {
      cats: [{ name: "Mochi", age: "3–7 years", weight: "4–5 kg" }],
      recipeSlugs: ["chicken-feast"],
      deliveryDate: "2026-06-15",
      frequency: null,
      email: null,
      furthestStep: "DELIVERY",
    };

    cy.visit("/en/wizard/cats", {
      onBeforeLoad(win) {
        (win as unknown as { __sorrelVariant: "A" }).__sorrelVariant = "A";
        win.localStorage.setItem(STORAGE_KEY, JSON.stringify(partialDraft));
      },
    });

    // Click the resume button — it routes to /wizard/delivery (segmentForStep maps
    // "DELIVERY" → "delivery" in state.ts).
    cy.get("button")
      .contains(/resume/i, { timeout: 8000 })
      .click();
    cy.location("pathname", { timeout: 8000 }).should("include", "/wizard/delivery");
  });

  it("does NOT show ResumeBanner when localStorage is empty (fresh session)", () => {
    // Explicitly clear storage (beforeEach already does this, but be explicit
    // about the expectation so the test documents the negative case).
    cy.visit("/en/wizard/cats", {
      onBeforeLoad(win) {
        (win as unknown as { __sorrelVariant: "A" }).__sorrelVariant = "A";
        // No localStorage seed — initial state has furthestStep: "CATS".
      },
    });

    // With furthestStep === "CATS", ResumeBanner returns null.
    cy.get("button")
      .contains(/resume/i)
      .should("not.exist");
  });
});
