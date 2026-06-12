"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { storyblokEditable } from "@storyblok/react/rsc";

import { sorrelTheme } from "@sorrel/ui";

import type { FeatureIcon, FeatureItemBlok } from "../../types/storyblok.gen";

/** Decorative token-built glyphs (spec 012) — simple shapes, no SVG art. */
function Glyph({ icon }: { icon: FeatureIcon }) {
  const size = { xs: 36, md: 40 };
  if (icon === "vet") {
    return (
      <Box
        aria-hidden
        sx={{
          width: size,
          height: size,
          borderRadius: "50%",
          bgcolor: sorrelTheme.accentTint,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: "primary.main" }} />
      </Box>
    );
  }
  if (icon === "portion") {
    return (
      <Box
        aria-hidden
        sx={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: 24,
            height: 24,
            bgcolor: sorrelTheme.accentTint,
            transform: "rotate(45deg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box sx={{ width: 10, height: 10, bgcolor: "primary.main" }} />
        </Box>
      </Box>
    );
  }
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: "2px",
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 16,
          borderRadius: "16px 16px 0 0",
          bgcolor: sorrelTheme.accentTint,
        }}
      />
      <Box sx={{ width: 32, height: 5, borderRadius: "2px", bgcolor: "primary.main" }} />
    </Box>
  );
}

export function FeatureItem({ blok }: { blok: FeatureItemBlok }) {
  return (
    <Box
      {...storyblokEditable(blok)}
      sx={{
        bgcolor: sorrelTheme.surface,
        border: "1.5px solid",
        borderColor: "divider",
        borderRadius: "16px",
        p: { xs: 2.25, md: 3.25 },
        display: "flex",
        flexDirection: { xs: "row", md: "column" },
        alignItems: "flex-start",
        gap: { xs: 1.75, md: 1.75 },
      }}
    >
      {blok.icon ? <Glyph icon={blok.icon} /> : null}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Typography sx={{ fontSize: { xs: 16, md: 17 }, fontWeight: 600, color: "text.primary" }}>
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
