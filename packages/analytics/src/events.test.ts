import type { FunnelEvent } from "./events";
import { createMemorySink, createTracker } from "./sink";

/**
 * Compile-time exhaustiveness: a `switch` over every event name with no `default`.
 * Because `event.name` is a finite union and `noImplicitReturns` is on, adding a
 * new event to the union without a case here fails type-check (a path would fall
 * through without returning). No `default` escape hatch swallows new events.
 */
function summarize(event: FunnelEvent): string {
  switch (event.name) {
    case "funnel_step_viewed":
      return `viewed ${event.step}`;
    case "step_completed":
      return `completed ${event.step}`;
    case "field_error":
      return `error ${event.field}=${event.error} on ${event.step}`;
    case "funnel_abandoned":
      return `abandoned at ${event.step}`;
    case "exit_intent_shown":
      return `exit-intent shown on ${event.step}`;
    case "exit_intent_recovered":
      return `exit-intent recovered on ${event.step}`;
    case "payment_intent_created":
      return `payment intent created for ${event.amount_minor} ${event.currency}`;
    case "payment_succeeded":
      return `payment succeeded for ${event.intent_id}`;
    case "payment_failed":
      return `payment failed (${event.code}) for ${event.intent_id ?? "unknown intent"}`;
    case "funnel_draft_resumed":
      return `draft resumed at ${event.step} from ${event.resumed_from}`;
    case "tts_play":
      return `tts play ${event.content_id} (${event.chars} chars)`;
    case "tts_pause":
      return `tts pause ${event.content_id} at ${event.position_s}s`;
    case "tts_ended":
      return `tts ended ${event.content_id}`;
    case "tts_error":
      return `tts error ${event.error} on ${event.content_id}`;
  }
}

describe("createTracker + memorySink", () => {
  it("captures emitted events in order", () => {
    const sink = createMemorySink();
    const track = createTracker(sink);

    track({ name: "funnel_step_viewed", step: "CATS" });
    track({ name: "step_completed", step: "CATS" });
    track({ name: "exit_intent_shown", step: "RECIPES" });
    track({ name: "exit_intent_recovered", step: "RECIPES" });

    expect(sink.events.map((event) => event.name)).toEqual([
      "funnel_step_viewed",
      "step_completed",
      "exit_intent_shown",
      "exit_intent_recovered",
    ]);
  });

  it("forwards the event payload faithfully", () => {
    const sink = createMemorySink();
    const track = createTracker(sink);

    track({ name: "field_error", step: "PROFILE", field: "weightKg", error: "out_of_range" });

    expect(sink.events[0]).toEqual({
      name: "field_error",
      step: "PROFILE",
      field: "weightKg",
      error: "out_of_range",
    });
  });

  it("clear() empties the capture buffer", () => {
    const sink = createMemorySink();
    sink.emit({ name: "funnel_abandoned", step: "PLAN" });
    expect(sink.events).toHaveLength(1);
    sink.clear();
    expect(sink.events).toHaveLength(0);
  });
});

describe("variant carriage (spec 043)", () => {
  it("preserves variant on step_completed and funnel_step_viewed through tracker→sink", () => {
    const sink = createMemorySink();
    const track = createTracker(sink);

    track({ name: "step_completed", step: "PROFILE", variant: "A" });
    track({ name: "funnel_step_viewed", step: "CATS", variant: "B" });

    expect(sink.events).toEqual([
      { name: "step_completed", step: "PROFILE", variant: "A" },
      { name: "funnel_step_viewed", step: "CATS", variant: "B" },
    ]);
  });

  it("preserves variant on the three payment events through tracker→sink", () => {
    const sink = createMemorySink();
    const track = createTracker(sink);

    track({
      name: "payment_intent_created",
      step: "CHECKOUT",
      amount_minor: 4995,
      currency: "GBP",
      variant: "A",
    });
    track({ name: "payment_succeeded", step: "CHECKOUT", intent_id: "pi_x", variant: "A" });
    track({
      name: "payment_failed",
      step: "CHECKOUT",
      intent_id: null,
      code: "card_declined",
      variant: "B",
    });

    expect(sink.events.map((event) => (event as { variant?: string }).variant)).toEqual([
      "A",
      "A",
      "B",
    ]);
  });

  it("preserves variant on the abandonment + exit-intent events through tracker→sink (spec 047)", () => {
    const sink = createMemorySink();
    const track = createTracker(sink);

    track({ name: "funnel_abandoned", step: "PLAN", variant: "A" });
    track({ name: "exit_intent_shown", step: "RECIPES", variant: "B" });
    track({ name: "exit_intent_recovered", step: "RECIPES", variant: "B" });

    expect(sink.events).toEqual([
      { name: "funnel_abandoned", step: "PLAN", variant: "A" },
      { name: "exit_intent_shown", step: "RECIPES", variant: "B" },
      { name: "exit_intent_recovered", step: "RECIPES", variant: "B" },
    ]);
  });
});

describe("summarize (exhaustiveness)", () => {
  it("handles every event variant", () => {
    expect(summarize({ name: "funnel_step_viewed", step: "CATS" })).toContain("viewed");
    expect(summarize({ name: "exit_intent_recovered", step: "RECIPES" })).toContain("recovered");
    expect(
      summarize({
        name: "payment_intent_created",
        step: "CHECKOUT",
        amount_minor: 4200,
        currency: "GBP",
      }),
    ).toContain("payment intent created");
    expect(
      summarize({ name: "payment_succeeded", step: "CHECKOUT", intent_id: "pi_test" }),
    ).toContain("succeeded");
    expect(
      summarize({
        name: "payment_failed",
        step: "CHECKOUT",
        intent_id: null,
        code: "card_declined",
      }),
    ).toContain("failed");
    expect(
      summarize({ name: "funnel_draft_resumed", step: "CATS", resumed_from: "PROFILE" }),
    ).toContain("resumed");
    expect(summarize({ name: "tts_play", content_id: "salmon", chars: 120 })).toContain("play");
    expect(summarize({ name: "tts_pause", content_id: "salmon", position_s: 2.5 })).toContain(
      "pause",
    );
    expect(summarize({ name: "tts_ended", content_id: "salmon" })).toContain("ended");
    expect(summarize({ name: "tts_error", content_id: "salmon", error: "rate_limited" })).toContain(
      "rate_limited",
    );
  });
});
