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
 * Spec 032/034: when the e2e hooks are enabled — `next dev` or the Cypress
 * production-build job (NEXT_PUBLIC_E2E === "1") — a memorySink is *always*
 * included and its `events` array is exposed at `window.__sorrelAnalyticsQueue`
 * so Cypress can assert the typed funnel events that fired across the happy
 * path. The hook stays stripped in the Vercel production deploy, where neither
 * flag holds.
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

  // Always include an in-memory sink for Cypress assertions when the e2e hooks
  // are enabled: `next dev` (NODE_ENV !== "production") or the Cypress
  // production-build job (NEXT_PUBLIC_E2E === "1", inlined at build time). The
  // window hook is read-only and stays stripped in the Vercel production deploy,
  // where neither flag holds.
  const e2eHooksEnabled =
    process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_E2E === "1";
  if (e2eHooksEnabled && typeof window !== "undefined") {
    const memorySink = createMemorySink();
    sinks.push(memorySink);
    window.__sorrelAnalyticsQueue = memorySink.events;
  }

  return createTracker(sinks.length > 0 ? fanOut(sinks) : createMemorySink());
}
