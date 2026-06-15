/**
 * In-memory per-IP token-bucket rate limit (spec 041 §5, Decision B2).
 *
 * Demo-tier — process-local, doesn't survive Lambda container churn or share
 * across serverless invocations. Honest for the demo, won't survive real
 * traffic. A future spec can upgrade to a shared store (Vercel KV / Redis)
 * without touching the call sites.
 *
 * Disabled in tests so unit-suite parallelism never collides on the global Map.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export type RateLimitResult = { ok: true } | { ok: false; retryAfter: number };

export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  if (process.env.NODE_ENV === "test") return { ok: true };
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (bucket.count >= max) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  bucket.count += 1;
  return { ok: true };
}

/** Vercel sets `x-forwarded-for` on the inbound request; first hop is the client. */
export function clientIp(request: { headers: { get(name: string): string | null } }): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return "unknown";
  const first = forwarded.split(",")[0]?.trim();
  return first || "unknown";
}
