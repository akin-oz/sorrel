"use client";

import Box from "@mui/material/Box";
import { storyblokEditable } from "@storyblok/react/rsc";

import type { PageBlok, PageBodyBlok } from "../../types/storyblok.gen";
import { CtaSection } from "./CtaSection";
import { FeatureGrid } from "./FeatureGrid";
import { Hero } from "./Hero";

function renderBlok(blok: PageBodyBlok) {
  switch (blok.component) {
    case "hero":
      return <Hero key={blok._uid} blok={blok} />;
    case "feature_grid":
      return <FeatureGrid key={blok._uid} blok={blok} />;
    case "cta_section":
      return <CtaSection key={blok._uid} blok={blok} />;
  }
}

export function Page({ blok }: { blok: PageBlok }) {
  return (
    <Box component="main" {...storyblokEditable(blok)} sx={{ minHeight: "100dvh" }}>
      {blok.body?.map(renderBlok)}
    </Box>
  );
}
