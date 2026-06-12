/**
 * App tracker construction (spec 010) — env-selected sink, deterministic default.
 *
 *   key present  -> posthogSink   (real funnel + experiments)
 *   no key       -> memorySink    (offline, reproducible; tests and the demo)
 *
 * The vendor SDK lives only behind `createPosthogSink`; this module decides
 * which sink to bind and returns the typed tracker the rest of the app uses.
 */
import { type Track, createMemorySink, createTracker } from "@sorrel/analytics";

import { createPosthogSink } from "./posthogSink";

export function createAppTracker(): Track {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const sink = key
    ? createPosthogSink(key, process.env.NEXT_PUBLIC_POSTHOG_HOST)
    : createMemorySink();
  return createTracker(sink);
}
