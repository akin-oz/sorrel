/**
 * Spec 053 — read-aloud (TTS) pure logic, shared by the `/api/tts` route and the
 * `ListenButton`. No Next.js imports, so it is unit-testable in isolation.
 */
import type { TtsErrorCode } from "@sorrel/analytics";

/** Hard cap on characters per request — bounds vendor cost per click. */
export const TTS_MAX_CHARS = 1000;

/** The error codes `/api/tts` can return in its `{ error }` body. */
export type TtsError = Exclude<TtsErrorCode, "network" | "playback_failed">;

export const TTS_ERROR_STATUS: Record<TtsError, number> = {
  invalid_json: 400,
  text_required: 400,
  text_too_long: 400,
  rate_limited: 429,
  not_configured: 503,
  upstream_error: 502,
};

export type TtsValidation = { ok: true; text: string } | { ok: false; error: TtsError };

export function validateTtsRequest(body: unknown): TtsValidation {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "invalid_json" };
  }
  const { text } = body as { text?: unknown };
  if (typeof text !== "string" || text.trim().length === 0) {
    return { ok: false, error: "text_required" };
  }
  if (text.length > TTS_MAX_CHARS) return { ok: false, error: "text_too_long" };
  return { ok: true, text };
}

/** Narrows an unknown `{ error }` response body to a known server error code. */
export function isTtsError(value: unknown): value is TtsError {
  return typeof value === "string" && value in TTS_ERROR_STATUS;
}

/**
 * Trims text to `TTS_MAX_CHARS` at the last word boundary so the client never
 * sends a request the route would reject.
 */
export function truncateForTts(text: string, max: number = TTS_MAX_CHARS): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd();
}

export interface RateLimiter {
  /** Records a hit for `key`; returns false once the key is over its limit. */
  check(key: string): boolean;
}

/**
 * Fixed-window, in-memory rate limiter. Per server instance and reset on cold
 * start — basic abuse protection, not a distributed quota (spec 053 out of scope).
 */
export function createRateLimiter({
  limit,
  windowMs,
  now = Date.now,
}: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    check(key) {
      const t = now();
      const current = windows.get(key);
      if (!current || t - current.start >= windowMs) {
        windows.set(key, { start: t, count: 1 });
        return true;
      }
      current.count += 1;
      return current.count <= limit;
    },
  };
}
