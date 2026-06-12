import type { ISbStoryData } from "@storyblok/react/rsc";

import { getStoryblokApi } from "../storyblok";
import type { PageBlok, RecipeBlok } from "../types/storyblok.gen";
import { recipeFallback } from "./cms-fallback";

/** True when a Storyblok token is configured; otherwise the app uses fallback content. */
export function hasStoryblokToken(): boolean {
  return Boolean(process.env.STORYBLOK_PUBLIC_TOKEN || process.env.STORYBLOK_PREVIEW_TOKEN);
}

function readToken(draft: boolean): string | undefined {
  return draft ? process.env.STORYBLOK_PREVIEW_TOKEN : process.env.STORYBLOK_PUBLIC_TOKEN;
}

/**
 * The `home` story for the active locale, or null when no token is set (the caller
 * renders fallback content). Tagged for on-publish `revalidateTag`.
 */
export async function getHomeStory(
  locale: string,
  draft: boolean,
): Promise<ISbStoryData<PageBlok> | null> {
  if (!hasStoryblokToken()) return null;
  const { data } = await getStoryblokApi().get(
    "cdn/stories/home",
    { version: draft ? "draft" : "published", language: locale, token: readToken(draft) },
    { next: { tags: ["cms", "story:home"] } },
  );
  return data.story as ISbStoryData<PageBlok>;
}

/** Recipe content for the active locale; falls back to the bundled set with no token. */
export async function getRecipes(locale: string, draft: boolean): Promise<RecipeBlok[]> {
  if (!hasStoryblokToken()) return recipeFallback(locale);
  const { data } = await getStoryblokApi().get(
    "cdn/stories",
    {
      version: draft ? "draft" : "published",
      language: locale,
      token: readToken(draft),
      content_type: "recipe",
    },
    { next: { tags: ["cms", "recipes"] } },
  );
  return (data.stories as ISbStoryData<RecipeBlok>[]).map((story) => story.content);
}
