"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { storyblokEditable } from "@storyblok/react/rsc";

import type { FeatureGridBlok } from "../../types/storyblok.gen";
import { Band } from "./Band";
import { FeatureItem } from "./FeatureItem";

export function FeatureGrid({ blok }: { blok: FeatureGridBlok }) {
  return (
    <Band
      editable={storyblokEditable(blok)}
      bg="background.paper"
      innerSx={{
        pb: { xs: 5, md: 10 },
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2.25, md: 3.5 },
      }}
    >
      <Typography
        variant="h2"
        sx={{ fontSize: { xs: 24, md: 32 }, maxWidth: "35rem", textWrap: "pretty" }}
      >
        {blok.heading}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
          gap: { xs: 1.5, md: 2.5 },
        }}
      >
        {blok.items?.map((item) => (
          <FeatureItem key={item._uid} blok={item} />
        ))}
      </Box>
    </Band>
  );
}
