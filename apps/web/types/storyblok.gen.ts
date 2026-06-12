/**
 * Typed bloks (spec 011) — the CMS content contract, the third firewall.
 *
 * Hand-authored to match the space's component schema; `yarn storyblok:types`
 * regenerates this from the live space (storyblok-generate-ts) once it exists.
 * Renderers type their `blok` prop from here — no ad-hoc content shapes. Each
 * extends `SbBlokData` so it satisfies `storyblokEditable`.
 */
import type { SbBlokData } from "@storyblok/react/rsc";

export interface SiteNavBlok extends SbBlokData {
  component: "site_nav";
  ctaLabel: string;
  ctaHref: string;
}

export interface HeroBlok extends SbBlokData {
  component: "hero";
  /** Mono kicker above the headline (spec 012); optional until the space adds it. */
  eyebrow?: string;
  headline: string;
  subcopy: string;
  ctaLabel: string;
  ctaHref: string;
  /** Reassurance line under the CTA, e.g. "Vet-formulated · Free delivery". */
  reassurance?: string;
  /** Hero image; a striped placeholder renders when unset. */
  image?: StoryblokAsset;
}

export type FeatureIcon = "vet" | "portion" | "delivery";

export interface FeatureItemBlok extends SbBlokData {
  component: "feature_item";
  /** Decorative token-built glyph (spec 012); omitted = no icon. */
  icon?: FeatureIcon;
  title: string;
  body: string;
}

export interface FeatureGridBlok extends SbBlokData {
  component: "feature_grid";
  heading: string;
  items: FeatureItemBlok[];
}

export interface HowStepBlok extends SbBlokData {
  component: "how_step";
  title: string;
  body: string;
}

export interface HowItWorksBlok extends SbBlokData {
  component: "how_it_works";
  eyebrow: string;
  heading: string;
  steps: HowStepBlok[];
}

/**
 * Copy-only blok: the cards render the locale's recipe stories from the existing
 * slug-keyed source (`getRecipes` / `recipeFallback`) — no duplicated recipe copy.
 */
export interface RecipeShowcaseBlok extends SbBlokData {
  component: "recipe_showcase";
  eyebrow: string;
  heading: string;
  subcopy: string;
}

export interface TestimonialItemBlok extends SbBlokData {
  component: "testimonial_item";
  quote: string;
  attribution: string;
}

export interface TestimonialSectionBlok extends SbBlokData {
  component: "testimonial_section";
  eyebrow: string;
  items: TestimonialItemBlok[];
}

export interface FaqItemBlok extends SbBlokData {
  component: "faq_item";
  question: string;
  answer: string;
}

export interface FaqSectionBlok extends SbBlokData {
  component: "faq_section";
  heading: string;
  items: FaqItemBlok[];
}

export interface CtaSectionBlok extends SbBlokData {
  component: "cta_section";
  heading: string;
  /** Supporting line under the heading (spec 012); optional until the space adds it. */
  subcopy?: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface FooterLinkBlok extends SbBlokData {
  component: "footer_link";
  label: string;
  /** Unset = rendered as plain text (no ghost routes until the page exists). */
  href?: string;
}

export interface FooterColumnBlok extends SbBlokData {
  component: "footer_column";
  heading: string;
  links: FooterLinkBlok[];
}

export interface SiteFooterBlok extends SbBlokData {
  component: "site_footer";
  columns: FooterColumnBlok[];
  legal: string;
}

export type PageBodyBlok =
  | SiteNavBlok
  | HeroBlok
  | FeatureGridBlok
  | HowItWorksBlok
  | RecipeShowcaseBlok
  | TestimonialSectionBlok
  | FaqSectionBlok
  | CtaSectionBlok
  | SiteFooterBlok;

export interface PageBlok extends SbBlokData {
  component: "page";
  body: PageBodyBlok[];
}

export interface StoryblokAsset {
  filename: string;
  alt?: string;
}

/** dietaryTags values mirror the schema's DietaryTag enum (asserted by a sync test). */
export interface RecipeBlok extends SbBlokData {
  component: "recipe";
  name: string;
  slug: string;
  description: string;
  image?: StoryblokAsset;
  dietaryTags: string[];
}
