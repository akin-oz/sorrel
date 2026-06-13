/**
 * The PostHog analytics sink (specs 010 + 014). Forwards each typed `FunnelEvent`
 * to PostHog's `capture` via the shared client (`./posthog`) — the same client the
 * A/B feature-flag read uses, so the SDK initialises exactly once.
 */
import type { AnalyticsSink, FunnelEvent } from "@sorrel/analytics";

import { getPostHog } from "./posthog";

export function createPosthogSink(): AnalyticsSink {
  return {
    emit(event: FunnelEvent) {
      const { name, ...props } = event;
      void getPostHog().then((posthog) => posthog?.capture(name, props));
    },
  };
}
