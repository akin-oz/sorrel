"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { storyblokEditable } from "@storyblok/react/rsc";

import { Link } from "../../i18n/navigation";
import type { CtaSectionBlok } from "../../types/storyblok.gen";

export function CtaSection({ blok }: { blok: CtaSectionBlok }) {
  return (
    <Box
      {...storyblokEditable(blok)}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        px: 2.5,
        py: 5,
        textAlign: "center",
      }}
    >
      <Typography variant="h2" sx={{ fontSize: "1.5rem", maxWidth: "28rem" }}>
        {blok.heading}
      </Typography>
      <Button
        component={Link}
        href={blok.ctaHref || "/wizard/cats"}
        variant="contained"
        size="large"
        sx={{ px: 3.5 }}
      >
        {blok.ctaLabel}
      </Button>
    </Box>
  );
}
