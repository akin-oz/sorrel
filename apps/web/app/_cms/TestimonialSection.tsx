"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { storyblokEditable } from "@storyblok/react/rsc";

import { FONT_MONO, FONT_SERIF, sorrelTheme } from "@sorrel/ui";

import type { TestimonialSectionBlok } from "../../types/storyblok.gen";
import { Band } from "./Band";

export function TestimonialSection({ blok }: { blok: TestimonialSectionBlok }) {
  return (
    <Band
      editable={storyblokEditable(blok)}
      bg="background.default"
      innerSx={{
        py: { xs: 5.5, md: 8 },
        display: "flex",
        flexDirection: "column",
        gap: { xs: 1.75, md: 3.5 },
      }}
    >
      <Typography variant="overline" sx={{ fontSize: { xs: 11, md: 12 }, color: sorrelTheme.mono }}>
        {blok.eyebrow}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: { xs: 4, md: 7 },
        }}
      >
        {blok.items?.map((item) => (
          <Box
            key={item._uid}
            {...storyblokEditable(item)}
            component="figure"
            sx={{ m: 0, display: "flex", flexDirection: "column", gap: 1.75 }}
          >
            <Typography
              component="blockquote"
              sx={{
                m: 0,
                fontFamily: FONT_SERIF,
                fontSize: { xs: 21, md: 24 },
                lineHeight: 1.4,
                color: "text.primary",
                textWrap: "pretty",
              }}
            >
              &ldquo;{item.quote}&rdquo;
            </Typography>
            <Typography
              component="figcaption"
              sx={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: sorrelTheme.mono,
              }}
            >
              {item.attribution}
            </Typography>
          </Box>
        ))}
      </Box>
    </Band>
  );
}
