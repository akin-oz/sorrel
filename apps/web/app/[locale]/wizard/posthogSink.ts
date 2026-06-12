/**
 * The PostHog adapter (spec 010) — the ONLY file that imports the vendor SDK.
 *
 * `posthog-js` is dynamically imported so it is loaded only when a project key
 * is present; the unkeyed path never pulls it in. Everything else in the app
 * speaks the typed `FunnelEvent` contract and never sees PostHog.
 */
import type { AnalyticsSink, FunnelEvent } from "@sorrel/analytics";

/** Build a sink that forwards each event to PostHog's `capture`. */
export function createPosthogSink(key: string, host?: string): AnalyticsSink {
  const ready = import("posthog-js").then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: host ?? "https://us.i.posthog.com",
      // We emit step views explicitly via funnel_step_viewed; no auto pageviews.
      capture_pageview: false,
      autocapture: false,
    });
    return posthog;
  });

  return {
    emit(event: FunnelEvent) {
      const { name, ...props } = event;
      void ready.then((posthog) => posthog.capture(name, props));
    },
  };
}
