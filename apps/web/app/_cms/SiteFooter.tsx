"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { storyblokEditable } from "@storyblok/react/rsc";

import { BrandLogo, FONT_MONO, FONT_SERIF, sorrelTheme } from "@sorrel/ui";

import { Link } from "../../i18n/navigation";
import type { FooterLinkBlok, SiteFooterBlok } from "../../types/storyblok.gen";
import { Band } from "./Band";

const LINK_SX = {
  fontSize: 14,
  color: sorrelTheme.dayMuted,
  textDecoration: "none",
  width: "fit-content",
  "&:hover": { textDecoration: "underline", textUnderlineOffset: "3px" },
} as const;

/** Anchors and routes link; entries without an href stay plain text (no ghost routes). */
function FooterEntry({ blok }: { blok: FooterLinkBlok }) {
  if (!blok.href) {
    return (
      <Typography {...storyblokEditable(blok)} sx={{ fontSize: 14, color: sorrelTheme.dayMuted }}>
        {blok.label}
      </Typography>
    );
  }
  if (blok.href.startsWith("#")) {
    return (
      <Box component="a" href={blok.href} {...storyblokEditable(blok)} sx={LINK_SX}>
        {blok.label}
      </Box>
    );
  }
  return (
    <Box component={Link} href={blok.href} {...storyblokEditable(blok)} sx={LINK_SX}>
      {blok.label}
    </Box>
  );
}

export function SiteFooter({ blok }: { blok: SiteFooterBlok }) {
  return (
    <Band
      component="footer"
      editable={storyblokEditable(blok)}
      bg="text.primary"
      innerSx={{
        pt: { xs: 5, md: 7 },
        pb: 3.5,
        display: "flex",
        flexDirection: "column",
        gap: { xs: 3.5, md: 4.5 },
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: { md: "space-between" },
          alignItems: { md: "flex-start" },
          gap: { xs: 3.5, md: 6 },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: sorrelTheme.onAccent }}>
          <BrandLogo size={22} />
          <Typography
            sx={{ fontFamily: FONT_SERIF, fontWeight: 700, fontSize: { xs: 20, md: 22 } }}
          >
            Sorrel
          </Typography>
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 160px)" },
            gap: 3,
          }}
        >
          {blok.columns?.map((column) => (
            <Box
              key={column._uid}
              {...storyblokEditable(column)}
              sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}
            >
              <Typography
                sx={{
                  fontFamily: FONT_MONO,
                  fontSize: 10.5,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: sorrelTheme.mono,
                }}
              >
                {column.heading}
              </Typography>
              {column.links?.map((link) => (
                <FooterEntry key={link._uid} blok={link} />
              ))}
            </Box>
          ))}
        </Box>
      </Box>
      <Typography
        sx={{
          borderTop: "1px solid rgba(255, 248, 242, 0.12)",
          pt: 2.25,
          fontSize: 12.5,
          lineHeight: 1.5,
          color: sorrelTheme.mono,
        }}
      >
        {blok.legal}
      </Typography>
    </Band>
  );
}
