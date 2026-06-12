"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { storyblokEditable } from "@storyblok/react/rsc";

import type { FeatureGridBlok } from "../../types/storyblok.gen";
import { FeatureItem } from "./FeatureItem";

export function FeatureGrid({ blok }: { blok: FeatureGridBlok }) {
  return (
    <Box
      {...storyblokEditable(blok)}
      sx={{ display: "flex", flexDirection: "column", gap: 2.5, px: 2.5, py: 4 }}
    >
      <Typography variant="h2" sx={{ fontSize: "1.5rem", textAlign: "center" }}>
        {blok.heading}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 2,
        }}
      >
        {blok.items?.map((item) => (
          <FeatureItem key={item._uid} blok={item} />
        ))}
      </Box>
    </Box>
  );
}
