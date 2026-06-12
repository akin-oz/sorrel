/**
 * Typed bloks (spec 011) — the CMS content contract, the third firewall.
 *
 * Hand-authored to match the space's component schema; `yarn storyblok:types`
 * regenerates this from the live space (storyblok-generate-ts) once it exists.
 * Renderers type their `blok` prop from here — no ad-hoc content shapes. Each
 * extends `SbBlokData` so it satisfies `storyblokEditable`.
 */
import type { SbBlokData } from "@storyblok/react/rsc";

export interface HeroBlok extends SbBlokData {
  component: "hero";
  headline: string;
  subcopy: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface FeatureItemBlok extends SbBlokData {
  component: "feature_item";
  title: string;
  body: string;
}

export interface FeatureGridBlok extends SbBlokData {
  component: "feature_grid";
  heading: string;
  items: FeatureItemBlok[];
}

export interface CtaSectionBlok extends SbBlokData {
  component: "cta_section";
  heading: string;
  ctaLabel: string;
  ctaHref: string;
}

export type PageBodyBlok = HeroBlok | FeatureGridBlok | CtaSectionBlok;

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
