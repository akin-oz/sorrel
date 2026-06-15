/**
 * Spec 032 — Funnel happy path, extended through CHECKOUT per spec 039 §6.
 *
 * One deterministic CATS → CHECKOUT walk under variant A. Asserts URL
 * transitions, no error states, the assembled SUMMARY copy, the Stripe
 * PaymentElement happy path with test card `4242 4242 4242 4242`, and that
 * the typed funnel events from `@sorrel/analytics` fired exactly once per
 * step (per spec 009 + spec 032's analytics section + spec 039 §5).
 *
 * Pre-conditions:
 *  - `cy.clearLocalStorage()` defeats the spec-010 resume banner.
 *  - `cy.clock(...)` fixes "today" so the picker's earliest deliverable
 *    arithmetic is deterministic.
 *  - `window.__sorrelVariant = "A"` pins the PROFILE A/B variant — the dev
 *    override in `useVariant` honours it under NODE_ENV !== "production".
 *  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` + `STRIPE_SECRET_KEY` are set in
 *    the env the dev server reads. Local: `apps/web/.env`. CI:
 *    `.github/workflows/cypress.yml` `env:` block (spec 039 §8). Without
 *    them, `/api/checkout/intent` returns 503 and the test fails on
 *    "Stripe test mode is not configured for this environment."
 */

// Steps match the FunnelStep enum in @sorrel/shared (uppercase).
// Decision A in spec 039 placed CHECKOUT after SUMMARY (review-then-pay).
const STEPS = ["CATS", "PROFILE", "RECIPES", "DELIVERY", "PLAN", "EMAIL", "SUMMARY", "CHECKOUT"];

interface QueuedEvent {
  name: string;
  step?: string;
  variant?: string;
  field?: string;
  error?: string;
  intent_id?: string;
}

describe("Funnel happy path", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.window().then((win) => win.sessionStorage.clear());
    // Stub ONLY Date (not setTimeout) so `useDraftAutosave`'s 600 ms
    // debounce still fires — without this, the draft never persists, the
    // FunnelProvider's draftId stays null, and the spec-039 CHECKOUT step
    // sees `amountMinor === null` and never asks `/api/checkout/intent`
    // for a clientSecret. The picker only needs Date to be pinned (for
    // earliest-deliverable arithmetic); timers must stay real.
    cy.clock(new Date("2026-06-12T09:00:00Z"), ["Date"]);
    // Spec 034: pin the SSR `today` (the server-computed value the picker
    // hydrates against). `cy.clock` only stubs the browser; the cookie is
    // how the dev-mode page reads a deterministic date for tests.
    cy.setCookie("sorrel_e2e_today", "2026-06-12");
  });

  it("completes CATS → CHECKOUT under variant A", () => {
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

    // 8 — CHECKOUT (spec 039). SUMMARY is no longer the terminal step;
    // Continue advances into the Stripe Payment Element. Intercept the
    // intent fetch so we can wait deterministically AND assert the route
    // returned 200 (the server-side recompute reaches Apollo and the draft
    // has a non-null `plan` — the latter relies on the autosave debounce
    // having actually fired, which is why beforeEach stubs Date alone).
    cy.intercept("POST", "/api/checkout/intent").as("intent");
    clickContinue();
    cy.location("pathname").should("include", "/wizard/checkout");

    // Bail loudly if the env is missing rather than silently looking for
    // an iframe that will never mount — spec 039 §8 makes the three
    // STRIPE_* secrets a CI requirement.
    cy.contains(/Stripe test mode is not configured/i).should("not.exist");

    cy.wait("@intent", { timeout: 20000 }).then((interception) => {
      expect(interception.response?.statusCode, "intent route succeeded").to.equal(200);
    });

    // Stripe creates several iframes: a 0×0 `__privateStripeController`
    // sibling, a metrics controller, and one visible PaymentElement frame
    // whose `name` ALSO starts with `__privateStripeFrame`. Selecting the
    // first match by name lands on the controller (no body forms) — we
    // filter to `:visible` to land on the actual PaymentElement.
    const stripeIframe = () =>
      cy
        .get('iframe[name^="__privateStripeFrame"]:visible', { timeout: 30000 })
        .first()
        .its("0.contentDocument.body")
        .should("not.be.empty")
        .then(cy.wrap);

    // `type({ delay: 30 })` because Stripe validates char-by-char inside
    // the iframe; the default Cypress typing speed is faster than the
    // formatter and drops digits in expiry / cvc.
    stripeIframe()
      .find('input[name="number"]', { timeout: 15000 })
      .should("be.visible")
      .type("4242424242424242", { delay: 30 });
    stripeIframe().find('input[name="expiry"]').type("1234", { delay: 30 });
    stripeIframe().find('input[name="cvc"]').type("123", { delay: 30 });
    // postalCode is conditional on the configured automatic_payment_methods —
    // fill only if Stripe rendered it for this region.
    stripeIframe().then((body) => {
      const $body = body as JQuery<HTMLElement>;
      const postal = $body.find('input[name="postalCode"]');
      if (postal.length) cy.wrap(postal).type("12345", { delay: 30 });
    });

    // The chrome HIDES its CTA on CHECKOUT (WizardChrome.tsx:69) — the
    // PaymentBody form owns the submit. Label comes from messages.Checkout.submit.
    cy.contains("button", /^Pay now$/, { timeout: 10000 }).click();

    // `redirect: "if_required"` (CheckoutForm.tsx) means the 4242 card —
    // which never triggers 3DS — resolves in-place. Spec 045 then navigates
    // explicitly via the locale-aware router to /wizard/summary?paid=1, the
    // same URL the 3DS return_url targets, so the SUMMARY success card
    // renders. The success signal is now (a) the typed event firing,
    // (b) the URL landing on /wizard/summary, and (c) the success copy
    // being on screen.
    cy.window({ timeout: 20000 }).should((win) => {
      const queue =
        (win as unknown as { __sorrelAnalyticsQueue?: QueuedEvent[] }).__sorrelAnalyticsQueue ?? [];
      const succeeded = queue.filter(
        (event) => event.name === "payment_succeeded" && event.step === "CHECKOUT",
      );
      expect(succeeded, "payment_succeeded fires once").to.have.length(1);
      expect(succeeded[0]?.intent_id, "intent_id is non-empty").to.match(/^pi_/);
    });
    // Spec 045 §1: non-3DS success navigates to SUMMARY where the success
    // card renders. The pathname must drift off CHECKOUT.
    cy.location("pathname", { timeout: 10000 }).should("include", "/wizard/summary");
    cy.location("search").should("include", "paid=1");
    cy.contains(/you're all set/i, { timeout: 10000 }).should("be.visible");

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
      // CHECKOUT does not fire step_completed — the Stripe form's submit
      // path goes through CheckoutForm.handleSubmit, not the chrome's
      // handleNext (which is what fires step_completed for the others).
      expect(completed, "step_completed for CATS…SUMMARY").to.deep.equal(STEPS.slice(0, 7));

      const profileCompleted = queue.find(
        (e) => e.name === "step_completed" && e.step === "PROFILE",
      );
      expect(profileCompleted?.variant, "PROFILE step carries variant: A").to.equal("A");

      // Spec 039 §5 typed events: one payment_intent_created, one
      // payment_succeeded, zero payment_failed.
      expect(
        queue.filter((e) => e.name === "payment_intent_created" && e.step === "CHECKOUT"),
        "payment_intent_created fires once with step=CHECKOUT",
      ).to.have.length(1);
      expect(
        queue.filter((e) => e.name === "payment_failed"),
        "no payment_failed on the happy path",
      ).to.have.length(0);

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
