"use client";

import { type ReactNode } from "react";

import { apiPlugin, storyblokInit } from "@storyblok/react/rsc";

import { CtaSection } from "./CtaSection";
import { FeatureGrid } from "./FeatureGrid";
import { FeatureItem } from "./FeatureItem";
import { Hero } from "./Hero";
import { Page } from "./Page";
import { RecipeCard } from "./RecipeCard";

// Client-side registration so the Visual Editor Bridge can resolve + highlight bloks.
storyblokInit({
  accessToken: process.env.NEXT_PUBLIC_STORYBLOK_PUBLIC_TOKEN,
  use: [apiPlugin],
  components: {
    page: Page,
    hero: Hero,
    feature_grid: FeatureGrid,
    feature_item: FeatureItem,
    cta_section: CtaSection,
    recipe: RecipeCard,
  },
});

export function StoryblokProvider({ children }: { children: ReactNode }) {
  return children;
}
