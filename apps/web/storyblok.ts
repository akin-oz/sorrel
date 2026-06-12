import { apiPlugin, storyblokInit } from "@storyblok/react/rsc";

import { CtaSection } from "./app/_cms/CtaSection";
import { FeatureGrid } from "./app/_cms/FeatureGrid";
import { FeatureItem } from "./app/_cms/FeatureItem";
import { Hero } from "./app/_cms/Hero";
import { Page } from "./app/_cms/Page";
import { RecipeCard } from "./app/_cms/RecipeCard";

/**
 * Server-side Storyblok init (spec 011). The component map binds each blok to an
 * MUI renderer; `getStoryblokApi` is used by server components to fetch stories.
 * No token is required to render a story object (fallback path stays offline).
 */
const serverToken = process.env.STORYBLOK_PUBLIC_TOKEN || process.env.STORYBLOK_PREVIEW_TOKEN;

export const getStoryblokApi = storyblokInit({
  accessToken: serverToken,
  // Only load the API plugin when a token exists; the fallback path never calls it.
  use: serverToken ? [apiPlugin] : [],
  apiOptions: { region: process.env.STORYBLOK_REGION === "us" ? "us" : "eu" },
  components: {
    page: Page,
    hero: Hero,
    feature_grid: FeatureGrid,
    feature_item: FeatureItem,
    cta_section: CtaSection,
    recipe: RecipeCard,
  },
});
