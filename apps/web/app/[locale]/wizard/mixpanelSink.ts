/**
 * The Mixpanel analytics sink (spec 014) — a second vendor behind the same
 * `AnalyticsSink` seam, which is the point: adding a destination is one method, no
 * change to any emit site. Lazy-loaded so `mixpanel-browser` is pulled in only when
 * `NEXT_PUBLIC_MIXPANEL_TOKEN` is set.
 */
import type { AnalyticsSink, FunnelEvent } from "@sorrel/analytics";

export function createMixpanelSink(token: string): AnalyticsSink {
  const ready = import("mixpanel-browser").then((m) => {
    const mixpanel = m.default;
    mixpanel.init(token, { track_pageview: false });
    return mixpanel;
  });

  return {
    emit(event: FunnelEvent) {
      const { name, ...props } = event;
      void ready.then((mixpanel) => mixpanel.track(name, props));
    },
  };
}
