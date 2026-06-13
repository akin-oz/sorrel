"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { storyblokEditable } from "@storyblok/react/rsc";

import { BrandLogo, FONT_SERIF } from "@sorrel/ui";

import { Link } from "../../i18n/navigation";
import type { SiteNavBlok } from "../../types/storyblok.gen";
import { LocaleSwitcher } from "../_components/LocaleSwitcher";
import { Band } from "./Band";

export function SiteNav({ blok }: { blok: SiteNavBlok }) {
  return (
    <Band
      component="header"
      editable={storyblokEditable(blok)}
      bg="background.paper"
      outerSx={{ borderBottom: "1px solid", borderColor: "divider" }}
      innerSx={{
        height: { xs: 64, md: 76 },
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Box
        component={Link}
        href="/"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: { xs: 1, md: 1.25 },
          color: "primary.main",
          textDecoration: "none",
          "& svg": { width: { xs: 22, md: 26 }, height: { xs: 22, md: 26 } },
        }}
      >
        <BrandLogo size={22} />
        <Typography
          sx={{
            fontFamily: FONT_SERIF,
            fontWeight: 700,
            fontSize: { xs: 21, md: 24 },
            color: "text.primary",
          }}
        >
          Sorrel
        </Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, md: 1.5 } }}>
        <LocaleSwitcher />
        <Button component={Link} href={blok.ctaHref || "/wizard/cats"} variant="contained">
          {blok.ctaLabel}
        </Button>
      </Box>
    </Band>
  );
}
