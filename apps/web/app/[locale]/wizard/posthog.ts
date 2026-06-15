import type { PostHog } from "posthog-js";

declare global {
  interface Window {
    posthog?: import("posthog-js").PostHog;
  }
}

/**
 * The single PostHog client (specs 010 + 014) — the one place `posthog-js` loads,
 * shared by the analytics sink AND the A/B feature-flag read. Lazy + cached, so it
 * loads only when `NEXT_PUBLIC_POSTHOG_KEY` is set; the unkeyed path resolves to
 * null (no SDK, no network) and callers fall back accordingly.
 */
let clientPromise: Promise<PostHog | null> | null = null;

export function getPostHog(): Promise<PostHog | null> {
  if (clientPromise) return clientPromise;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || typeof window === "undefined") {
    clientPromise = Promise.resolve(null);
    return clientPromise;
  }

  clientPromise = import("posthog-js").then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      defaults: "2026-01-30",
      capture_pageview: false,
      autocapture: false,
    });
    if (typeof window !== "undefined") {
      window.posthog = posthog;
    }
    return posthog;
  });
  return clientPromise;
}
