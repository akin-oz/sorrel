"use client";

import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import type { storyblokEditable } from "@storyblok/react/rsc";
import type { ElementType, ReactNode } from "react";

/**
 * Full-bleed section band (spec 012). Each blok owns its background colour and
 * constrains its inner content — the design's 1120px column (720px for FAQ/CTA)
 * with 20px sides on mobile — so bloks stay reorderable without a shared shell.
 */
export function Band({
  component = "section",
  editable,
  id,
  bg,
  maxWidth = 1120,
  outerSx,
  innerSx,
  children,
}: {
  /** Semantic element for the band: section (default), header, footer. */
  component?: ElementType;
  editable?: ReturnType<typeof storyblokEditable>;
  id?: string;
  /** Band background; a theme palette key or token value. */
  bg?: string;
  /** Inner content width in px; the design uses 1120 (default) and 720. */
  maxWidth?: number;
  outerSx?: SxProps<Theme>;
  innerSx?: SxProps<Theme>;
  children: ReactNode;
}) {
  return (
    <Box
      component={component}
      id={id}
      {...editable}
      sx={[{ width: "100%", bgcolor: bg, px: { xs: 2.5, md: 5 } }, ...wrap(outerSx)]}
    >
      <Box sx={[{ width: "100%", maxWidth: `${maxWidth}px`, mx: "auto" }, ...wrap(innerSx)]}>
        {children}
      </Box>
    </Box>
  );
}

function wrap(sx?: SxProps<Theme>) {
  return Array.isArray(sx) ? sx : sx ? [sx] : [];
}
