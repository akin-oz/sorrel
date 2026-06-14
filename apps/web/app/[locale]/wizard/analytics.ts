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
 *
 * Spec 032: in non-production builds, a memorySink is *always* included and its
 * `events` array is exposed at `window.__sorrelAnalyticsQueue` so Cypress can
 * assert the typed funnel events that fired across the happy path. The hook is
 * stripped in production by the `NODE_ENV !== "production"` guard.
 */
import {
  type AnalyticsSink,
  type FunnelEvent,
  type Track,
  createMemorySink,
  createTracker,
} from "@sorrel/analytics";

import { createMixpanelSink } from "./mixpanelSink";
import { createPosthogSink } from "./posthogSink";

declare global {
  interface Window {
    /** Spec 032 — read-only mirror of the in-memory analytics queue, dev only. */
    __sorrelAnalyticsQueue?: readonly FunnelEvent[];
  }
}

function fanOut(sinks: AnalyticsSink[]): AnalyticsSink {
  return { emit: (event) => sinks.forEach((sink) => sink.emit(event)) };
}

export function createAppTracker(): Track {
  const sinks: AnalyticsSink[] = [];
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) sinks.push(createPosthogSink());
  const mixpanelToken = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  if (mixpanelToken) sinks.push(createMixpanelSink(mixpanelToken));

  // Always include an in-memory sink in non-production for Cypress assertions.
  // The window hook is read-only and stripped in production builds.
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    const memorySink = createMemorySink();
    sinks.push(memorySink);
    window.__sorrelAnalyticsQueue = memorySink.events;
  }

  return createTracker(sinks.length > 0 ? fanOut(sinks) : createMemorySink());
}
