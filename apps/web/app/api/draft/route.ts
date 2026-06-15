import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";

/**
 * Enter Storyblok Visual Editor preview (spec 011). The space's preview URL points
 * here with ?secret=<STORYBLOK_PREVIEW_SECRET>&slug=<path>; we verify the secret,
 * enable Next draft mode (so CMS reads switch to the draft version), and redirect
 * to the previewed path.
 *
 * Spec 041 §4: constant-time secret compare via `timingSafeEqual`, mirroring
 * the pattern in the Storyblok webhook handler. Length guard required because
 * `timingSafeEqual` throws on unequal-length buffers.
 */
function secretsMatch(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const slug = searchParams.get("slug") ?? "/";

  const expected = process.env.STORYBLOK_PREVIEW_SECRET;
  if (!expected || !secret || !secretsMatch(secret, expected)) {
    return new Response("Invalid preview secret", { status: 401 });
  }

  (await draftMode()).enable();
  // Only allow same-site relative redirects (no protocol-relative "//host").
  const safe = slug.startsWith("/") && !slug.startsWith("//") ? slug : "/";
  redirect(safe);
}
