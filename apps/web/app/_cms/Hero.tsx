"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { storyblokEditable } from "@storyblok/react/rsc";

import { Link } from "../../i18n/navigation";
import type { HeroBlok } from "../../types/storyblok.gen";

export function Hero({ blok }: { blok: HeroBlok }) {
  return (
    <Box
      {...storyblokEditable(blok)}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2.5,
        px: 2.5,
        py: 6,
        textAlign: "center",
      }}
    >
      <Typography variant="h1" sx={{ maxWidth: "32rem", fontSize: "clamp(1.9rem, 6vw, 2.6rem)" }}>
        {blok.headline}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: "30rem" }}>
        {blok.subcopy}
      </Typography>
      <Button
        component={Link}
        href={blok.ctaHref || "/wizard/cats"}
        variant="contained"
        size="large"
        sx={{ mt: 1, px: 3.5 }}
      >
        {blok.ctaLabel}
      </Button>
    </Box>
  );
}
