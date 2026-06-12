import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Enter Storyblok Visual Editor preview (spec 011). The space's preview URL points
 * here with ?secret=<STORYBLOK_PREVIEW_SECRET>&slug=<path>; we verify the secret,
 * enable Next draft mode (so CMS reads switch to the draft version), and redirect
 * to the previewed path.
 */
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const slug = searchParams.get("slug") ?? "/";

  if (!process.env.STORYBLOK_PREVIEW_SECRET || secret !== process.env.STORYBLOK_PREVIEW_SECRET) {
    return new Response("Invalid preview secret", { status: 401 });
  }

  (await draftMode()).enable();
  // Only allow same-site relative redirects (no protocol-relative "//host").
  const safe = slug.startsWith("/") && !slug.startsWith("//") ? slug : "/";
  redirect(safe);
}
