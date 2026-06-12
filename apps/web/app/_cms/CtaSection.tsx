"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { storyblokEditable } from "@storyblok/react/rsc";

import { BrandLogo, sorrelTheme } from "@sorrel/ui";

import { Link } from "../../i18n/navigation";
import type { CtaSectionBlok } from "../../types/storyblok.gen";
import { Band } from "./Band";

export function CtaSection({ blok }: { blok: CtaSectionBlok }) {
  return (
    <Band
      editable={storyblokEditable(blok)}
      bg="primary.main"
      maxWidth={720}
      innerSx={{
        py: { xs: 6.5, md: 11 },
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: { xs: 2, md: 2.25 },
        textAlign: "center",
      }}
    >
      <Box sx={{ display: "flex", color: sorrelTheme.onAccent }}>
        <BrandLogo size={32} />
      </Box>
      <Typography
        variant="h2"
        sx={{
          fontSize: { xs: 27, md: 38 },
          lineHeight: { xs: 1.2, md: 1.15 },
          color: sorrelTheme.onAccent,
          maxWidth: "28rem",
          textWrap: "pretty",
        }}
      >
        {blok.heading}
      </Typography>
      {blok.subcopy ? (
        <Typography sx={{ fontSize: { xs: 15, md: 16 }, color: sorrelTheme.accentTint }}>
          {blok.subcopy}
        </Typography>
      ) : null}
      <Button
        component={Link}
        href={blok.ctaHref || "/wizard/cats"}
        variant="contained"
        size="large"
        sx={{
          mt: { xs: 0.75, md: 1 },
          px: { md: 4.5 },
          minHeight: { md: 56 },
          fontSize: { md: 17 },
          alignSelf: { xs: "stretch", md: "center" },
          bgcolor: sorrelTheme.onAccent,
          color: "primary.main",
          "&:hover": { bgcolor: sorrelTheme.accentTint },
        }}
      >
        {blok.ctaLabel}
      </Button>
    </Band>
  );
}
