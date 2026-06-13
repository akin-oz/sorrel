/**
 * App tracker construction (specs 010 + 014) — env-selected sinks, deterministic
 * default.
 *
 *   PostHog key   -> posthogSink    (the live funnel + experiments source)
 *   Mixpanel token-> mixpanelSink   (a second destination, via the same seam)
 *   neither       -> memorySink     (offline, reproducible; tests and the demo)
 *
 * Vendor SDKs live only behind their sinks; this module fans events out to every
 * configured destination and returns the typed tracker the rest of the app uses.
 */
import { type AnalyticsSink, type Track, createMemorySink, createTracker } from "@sorrel/analytics";

import { createMixpanelSink } from "./mixpanelSink";
import { createPosthogSink } from "./posthogSink";

function fanOut(sinks: AnalyticsSink[]): AnalyticsSink {
  return { emit: (event) => sinks.forEach((sink) => sink.emit(event)) };
}

export function createAppTracker(): Track {
  const sinks: AnalyticsSink[] = [];
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) sinks.push(createPosthogSink());
  const mixpanelToken = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  if (mixpanelToken) sinks.push(createMixpanelSink(mixpanelToken));

  return createTracker(sinks.length > 0 ? fanOut(sinks) : createMemorySink());
}
