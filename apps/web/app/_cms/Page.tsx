"use client";

import { storyblokEditable } from "@storyblok/react/rsc";

import { AppBox } from "@sorrel/ui";

import type { PageBlok, PageBodyBlok } from "../../types/storyblok.gen";
import { CtaSection } from "./CtaSection";
import { FaqSection } from "./FaqSection";
import { FeatureGrid } from "./FeatureGrid";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { RecipeShowcase } from "./RecipeShowcase";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";
import { TestimonialSection } from "./TestimonialSection";

function renderBlok(blok: PageBodyBlok) {
  switch (blok.component) {
    case "site_nav":
      return <SiteNav key={blok._uid} blok={blok} />;
    case "hero":
      return <Hero key={blok._uid} blok={blok} />;
    case "feature_grid":
      return <FeatureGrid key={blok._uid} blok={blok} />;
    case "how_it_works":
      return <HowItWorks key={blok._uid} blok={blok} />;
    case "recipe_showcase":
      return <RecipeShowcase key={blok._uid} blok={blok} />;
    case "testimonial_section":
      return <TestimonialSection key={blok._uid} blok={blok} />;
    case "faq_section":
      return <FaqSection key={blok._uid} blok={blok} />;
    case "cta_section":
      return <CtaSection key={blok._uid} blok={blok} />;
    case "site_footer":
      return <SiteFooter key={blok._uid} blok={blok} />;
  }
}

/**
 * Full-bleed page shell (spec 012): each blok band owns its background and inner
 * column, so the body stays a plain map — reorderable in Storyblok with no
 * layout coupling between neighbours.
 */
export function Page({ blok }: { blok: PageBlok }) {
  return (
    <AppBox component="main" width="100%" editable={storyblokEditable(blok)}>
      {blok.body?.map(renderBlok)}
    </AppBox>
  );
}
