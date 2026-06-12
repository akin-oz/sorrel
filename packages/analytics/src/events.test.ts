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

describe("summarize (exhaustiveness)", () => {
  it("handles every event variant", () => {
    expect(summarize({ name: "funnel_step_viewed", step: "CATS" })).toContain("viewed");
    expect(summarize({ name: "exit_intent_recovered", step: "RECIPES" })).toContain("recovered");
  });
});
