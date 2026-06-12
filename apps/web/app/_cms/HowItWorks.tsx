"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { storyblokEditable } from "@storyblok/react/rsc";

import { FONT_SERIF, sorrelTheme } from "@sorrel/ui";

import type { HowItWorksBlok, HowStepBlok } from "../../types/storyblok.gen";
import { Band } from "./Band";

function Step({ blok, index }: { blok: HowStepBlok; index: number }) {
  return (
    <Box
      {...storyblokEditable(blok)}
      sx={{
        display: "flex",
        flexDirection: { xs: "row", md: "column" },
        gap: { xs: 2.25, md: 1.5 },
        alignItems: "flex-start",
      }}
    >
      <Typography
        aria-hidden
        sx={{
          fontFamily: FONT_SERIF,
          fontSize: { xs: 40, md: 58 },
          lineHeight: 1,
          fontWeight: 700,
          color: "primary.main",
          width: { xs: 34, md: "auto" },
          flexShrink: 0,
        }}
      >
        {index + 1}
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, pt: { xs: 0.5, md: 0 } }}>
        <Typography sx={{ fontSize: { xs: 16, md: 18 }, fontWeight: 600, color: "text.primary" }}>
          {blok.title}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: { xs: 14, md: 15 }, lineHeight: 1.55 }}
        >
          {blok.body}
        </Typography>
      </Box>
    </Box>
  );
}

export function HowItWorks({ blok }: { blok: HowItWorksBlok }) {
  return (
    <Band
      editable={storyblokEditable(blok)}
      bg="background.default"
      innerSx={{
        py: { xs: 5.5, md: 9 },
        display: "flex",
        flexDirection: "column",
        gap: { xs: 3, md: 4.5 },
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 0.75, md: 1 } }}>
        <Typography variant="overline" sx={{ fontSize: { xs: 11, md: 12 }, color: sorrelTheme.mono }}>
          {blok.eyebrow}
        </Typography>
        <Typography variant="h2" sx={{ fontSize: { xs: 24, md: 32 } }}>
          {blok.heading}
        </Typography>
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
          gap: { xs: 2.75, md: 5.5 },
        }}
      >
        {blok.steps?.map((step, i) => (
          <Step key={step._uid} blok={step} index={i} />
        ))}
      </Box>
    </Band>
  );
}
