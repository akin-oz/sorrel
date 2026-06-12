import { StoryblokStory } from "@storyblok/react/rsc";
import { setRequestLocale } from "next-intl/server";
import { draftMode } from "next/headers";

import { getHomeStory } from "../../lib/cms";
import { homeFallbackContent } from "../../lib/cms-fallback";
import { Page } from "../_cms/Page";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { isEnabled } = await draftMode();
  const story = await getHomeStory(locale, isEnabled);

  // Live editing on the API path; the typed Page blok directly on the fallback path.
  return story ? <StoryblokStory story={story} /> : <Page blok={homeFallbackContent(locale)} />;
}
