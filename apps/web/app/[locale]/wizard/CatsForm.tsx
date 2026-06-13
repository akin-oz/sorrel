"use client";

import { useEffect } from "react";

import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";

import { sorrelTheme } from "@sorrel/ui";

import { useFunnel } from "./FunnelProvider";
import { MAX_CATS, MIN_CATS } from "./state";

const COUNTS = Array.from({ length: MAX_CATS - MIN_CATS + 1 }, (_, i) => MIN_CATS + i);

/**
 * CATS step (spec 016) — the funnel's first input: how many cats to feed.
 *
 * The handoff's selectable count cards: a four-up grid (1 · 2 · 3 · 4+) where each
 * card carries a big serif numeral over its unit label, and the chosen one takes
 * the accent border + tint. Backed by a ToggleButtonGroup so selection state and
 * keyboard semantics (single-select, arrow keys, aria-pressed) come for free. Lands
 * on 1 so the page always opens valid; PROFILE then scales the plan by count.
 */
export function CatsForm() {
  const t = useTranslations("Cats");
  const { state, dispatch } = useFunnel();
  const count = state.cats.length || MIN_CATS;

  // Default to one cat on first entry so the funnel always has a valid count.
  useEffect(() => {
    if (state.cats.length === 0) dispatch({ type: "SET_CAT_COUNT", count: MIN_CATS });
  }, [state.cats.length, dispatch]);

  function choose(_event: React.MouseEvent<HTMLElement>, next: number | null) {
    if (next) dispatch({ type: "SET_CAT_COUNT", count: next });
  }

  return (
    <ToggleButtonGroup
      exclusive
      value={count}
      onChange={choose}
      aria-label={t("legend")}
      sx={{
        display: "grid",
        // 2×2 on mobile (the handoff's mobile card), 4-up on the desktop form pane.
        gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
        gap: { xs: "12px", md: "14px" },
        // Reset ToggleButtonGroup's "connected" grouping (negative margins, squared
        // inner corners) so each option reads as a standalone rounded card.
        "& .MuiToggleButtonGroup-grouped": {
          m: 0,
          minWidth: 0,
          flexDirection: "column",
          gap: "2px",
          height: { xs: 96, md: 104 },
          borderRadius: "16px",
          border: "1.5px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          "&.Mui-selected": {
            bgcolor: sorrelTheme.accentTint,
            borderWidth: 2,
            borderColor: "primary.main",
            "&:hover": { bgcolor: sorrelTheme.accentTint },
          },
        },
      }}
    >
      {COUNTS.map((n) => {
        const selected = count === n;
        return (
          <ToggleButton key={n} value={n} aria-label={t("count", { count: n })}>
            <Typography
              variant="h3"
              component="span"
              sx={{
                fontSize: { xs: "1.5rem", md: "1.875rem" },
                lineHeight: 1,
                color: selected ? "primary.main" : "text.primary",
              }}
            >
              {n === MAX_CATS ? `${n}+` : n}
            </Typography>
            <Typography
              component="span"
              sx={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: "none",
                color: selected ? "primary.main" : "text.secondary",
              }}
            >
              {t("unit", { count: n })}
            </Typography>
          </ToggleButton>
        );
      })}
    </ToggleButtonGroup>
  );
}
