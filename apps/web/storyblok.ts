import { apiPlugin, storyblokInit } from "@storyblok/react/rsc";

import { CtaSection } from "./app/_cms/CtaSection";
import { FeatureGrid } from "./app/_cms/FeatureGrid";
import { FeatureItem } from "./app/_cms/FeatureItem";
import { Hero } from "./app/_cms/Hero";
import { Page } from "./app/_cms/Page";

/**
 * Server-side Storyblok init (spec 011). The component map binds each blok to an
 * MUI renderer; `getStoryblokApi` is used by server components to fetch stories.
 * No token is required to render a story object (fallback path stays offline).
 */
export const getStoryblokApi = storyblokInit({
  accessToken: process.env.STORYBLOK_PUBLIC_TOKEN,
  use: [apiPlugin],
  apiOptions: { region: process.env.STORYBLOK_REGION === "us" ? "us" : "eu" },
  components: {
    page: Page,
    hero: Hero,
    feature_grid: FeatureGrid,
    feature_item: FeatureItem,
    cta_section: CtaSection,
  },
});
