import { StoryblokStory } from "@storyblok/react/rsc";
import { setRequestLocale } from "next-intl/server";
import { draftMode } from "next/headers";

import { getHomeStory, getRecipes } from "../../lib/cms";
import { homeFallbackContent } from "../../lib/cms-fallback";
import { LandingRecipesProvider } from "../_cms/LandingRecipesProvider";
import { Page } from "../_cms/Page";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { isEnabled } = await draftMode();
  const [story, recipes] = await Promise.all([
    getHomeStory(locale, isEnabled),
    // The recipe_showcase blok is copy-only; the cards come from the slug-keyed
    // recipe source (CMS stories or the bundled fallback), provided via context.
    getRecipes(locale, isEnabled),
  ]);

  // Live editing on the API path; the typed Page blok directly on the fallback path.
  return (
    <LandingRecipesProvider recipes={recipes}>
      {story ? <StoryblokStory story={story} /> : <Page blok={homeFallbackContent(locale)} />}
    </LandingRecipesProvider>
  );
}
