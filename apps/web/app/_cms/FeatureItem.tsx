"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { storyblokEditable } from "@storyblok/react/rsc";

import type { FeatureItemBlok } from "../../types/storyblok.gen";

export function FeatureItem({ blok }: { blok: FeatureItemBlok }) {
  return (
    <Box {...storyblokEditable(blok)} sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      <Typography variant="h3" sx={{ fontSize: "1.1rem", fontWeight: 700 }}>
        {blok.title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {blok.body}
      </Typography>
    </Box>
  );
}
