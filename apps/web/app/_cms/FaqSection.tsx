"use client";

import { useState } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { storyblokEditable } from "@storyblok/react/rsc";

import type { FaqItemBlok, FaqSectionBlok } from "../../types/storyblok.gen";
import { Band } from "./Band";

function FaqRow({ blok }: { blok: FaqItemBlok }) {
  const [open, setOpen] = useState(false);
  const buttonId = `faq-button-${blok._uid}`;
  const panelId = `faq-panel-${blok._uid}`;
  return (
    <Box
      {...storyblokEditable(blok)}
      sx={{
        borderTop: "1px solid",
        borderColor: "divider",
        "&:last-of-type": { borderBottom: "1px solid", borderBottomColor: "divider" },
      }}
    >
      <Box
        component="button"
        type="button"
        id={buttonId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        sx={{
          width: "100%",
          minHeight: { xs: 56, md: 60 },
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          p: 0,
          border: 0,
          background: "none",
          cursor: "pointer",
          textAlign: "left",
          font: "inherit",
        }}
      >
        <Typography sx={{ fontSize: { xs: 15, md: 16 }, fontWeight: 600, color: "text.primary" }}>
          {blok.question}
        </Typography>
        <Box
          aria-hidden
          sx={{
            width: 44,
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: { xs: 20, md: 22 },
            color: "primary.main",
            flexShrink: 0,
          }}
        >
          {open ? "–" : "+"}
        </Box>
      </Box>
      <Box id={panelId} role="region" aria-labelledby={buttonId} hidden={!open}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: { xs: 14, md: 15 }, lineHeight: 1.6, pr: 5.5, pb: { xs: 2, md: 2.25 } }}
        >
          {blok.answer}
        </Typography>
      </Box>
    </Box>
  );
}

export function FaqSection({ blok }: { blok: FaqSectionBlok }) {
  return (
    <Band
      editable={storyblokEditable(blok)}
      id="faq"
      bg="background.paper"
      maxWidth={720}
      innerSx={{
        py: { xs: 5.5, md: 10 },
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2, md: 2.25 },
      }}
    >
      <Typography variant="h2" sx={{ fontSize: { xs: 24, md: 32 } }}>
        {blok.heading}
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        {blok.items?.map((item) => (
          <FaqRow key={item._uid} blok={item} />
        ))}
      </Box>
    </Band>
  );
}
