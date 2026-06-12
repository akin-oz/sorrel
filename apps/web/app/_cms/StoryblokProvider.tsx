"use client";

import { type ReactNode } from "react";

import { apiPlugin, storyblokInit } from "@storyblok/react/rsc";

import { CtaSection } from "./CtaSection";
import { FaqSection } from "./FaqSection";
import { FeatureGrid } from "./FeatureGrid";
import { FeatureItem } from "./FeatureItem";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { Page } from "./Page";
import { RecipeCard } from "./RecipeCard";
import { RecipeShowcase } from "./RecipeShowcase";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";
import { TestimonialSection } from "./TestimonialSection";

// Client-side registration so the Visual Editor Bridge can resolve + highlight bloks.
const clientToken = process.env.NEXT_PUBLIC_STORYBLOK_PUBLIC_TOKEN;
storyblokInit({
  accessToken: clientToken,
  use: clientToken ? [apiPlugin] : [],
  components: {
    page: Page,
    site_nav: SiteNav,
    hero: Hero,
    feature_grid: FeatureGrid,
    feature_item: FeatureItem,
    how_it_works: HowItWorks,
    recipe_showcase: RecipeShowcase,
    testimonial_section: TestimonialSection,
    faq_section: FaqSection,
    cta_section: CtaSection,
    site_footer: SiteFooter,
    recipe: RecipeCard,
  },
});

export function StoryblokProvider({ children }: { children: ReactNode }) {
  return children;
}
