"use client";

import { storyblokEditable } from "@storyblok/react/rsc";

import { AppBand, AppGrid, AppHeading, AppStack } from "@sorrel/ui";

import type { FeatureGridBlok } from "../../types/storyblok.gen";
import { FeatureItem } from "./FeatureItem";

export function FeatureGrid({ blok }: { blok: FeatureGridBlok }) {
  return (
    <AppBand tone="paper" editable={storyblokEditable(blok)}>
      <AppStack gap={{ xs: 2.25, md: 3.5 }} pb={{ xs: 5, md: 10 }}>
        <AppHeading level={2} fontSize={{ xs: 24, md: 32 }} maxWidth="35rem" textWrap="pretty">
          {blok.heading}
        </AppHeading>
        <AppGrid columns={{ xs: "1fr", md: "1fr 1fr 1fr" }} gap={{ xs: 1.5, md: 2.5 }}>
          {blok.items?.map((item) => (
            <FeatureItem key={item._uid} blok={item} />
          ))}
        </AppGrid>
      </AppStack>
    </AppBand>
  );
}
