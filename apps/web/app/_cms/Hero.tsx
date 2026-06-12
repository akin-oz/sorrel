"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { storyblokEditable } from "@storyblok/react/rsc";

import { sorrelTheme } from "@sorrel/ui";

import { Link } from "../../i18n/navigation";
import type { HeroBlok } from "../../types/storyblok.gen";
import { Band } from "./Band";
import { STRIPED_PLACEHOLDER } from "./placeholder";

export function Hero({ blok }: { blok: HeroBlok }) {
  return (
    <Band
      editable={storyblokEditable(blok)}
      bg="background.paper"
      innerSx={{
        py: { xs: 4.5, md: 9 },
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1.05fr 1fr" },
        gap: { xs: 3, md: 7 },
        alignItems: "center",
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 1.5, md: 2.5 } }}>
        {blok.eyebrow ? (
          <Typography
            variant="overline"
            sx={{ fontSize: { xs: 11, md: 12 }, color: sorrelTheme.mono }}
          >
            {blok.eyebrow}
          </Typography>
        ) : null}
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: 34, md: 52 },
            lineHeight: { xs: 1.12, md: 1.08 },
            textWrap: "pretty",
          }}
        >
          {blok.headline}
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ fontSize: { xs: 15, md: 17 }, lineHeight: 1.6, maxWidth: "29rem" }}
        >
          {blok.subcopy}
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            alignItems: { xs: "stretch", md: "flex-start" },
            mt: 0.5,
          }}
        >
          <Button
            component={Link}
            href={blok.ctaHref || "/wizard/cats"}
            variant="contained"
            size="large"
            sx={{ px: { md: 4.25 }, minHeight: { md: 56 }, fontSize: { md: 17 } }}
          >
            {blok.ctaLabel}
          </Button>
          {blok.reassurance ? (
            <Typography
              variant="body2"
              sx={{
                fontSize: { xs: 13, md: 14 },
                color: "text.secondary",
                textAlign: { xs: "center", md: "left" },
              }}
            >
              {blok.reassurance}
            </Typography>
          ) : null}
        </Box>
      </Box>
      {blok.image?.filename ? (
        <Box
          component="img"
          src={blok.image.filename}
          alt={blok.image.alt ?? ""}
          sx={{
            width: "100%",
            height: { xs: 250, md: 440 },
            objectFit: "cover",
            borderRadius: { xs: "20px", md: "24px" },
          }}
        />
      ) : (
        <Box
          aria-hidden
          sx={{
            height: { xs: 250, md: 440 },
            borderRadius: { xs: "20px", md: "24px" },
            background: STRIPED_PLACEHOLDER,
          }}
        />
      )}
    </Band>
  );
}
