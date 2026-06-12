import { revalidateTag } from "next/cache";
import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

/**
 * On-publish revalidation (spec 011). Storyblok signs each webhook with an
 * HMAC-SHA1 of the body using STORYBLOK_WEBHOOK_SECRET (header `webhook-signature`).
 * We verify it, then revalidateTag the CMS caches so a publish refreshes the live
 * site with no redeploy. CMS fetches are tagged "cms" + "story:<full_slug>".
 */
function verify(signature: string | null, body: string, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha1", secret).update(body).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.STORYBLOK_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook secret not configured", { status: 500 });

  const body = await request.text();
  if (!verify(request.headers.get("webhook-signature"), body, secret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: { full_slug?: string } = {};
  try {
    payload = JSON.parse(body) as { full_slug?: string };
  } catch {
    // Body may be empty/non-JSON for some events — the "cms" tag still covers them.
  }

  // Purge immediately (CacheLifeConfig expire: 0) — route handlers use revalidateTag.
  revalidateTag("cms", { expire: 0 });
  if (payload.full_slug) revalidateTag(`story:${payload.full_slug}`, { expire: 0 });

  return Response.json({ revalidated: true });
}
