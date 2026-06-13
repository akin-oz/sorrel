"use client";

import { useEffect } from "react";

import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useTranslations } from "next-intl";

import { useFunnel } from "./FunnelProvider";
import { MAX_CATS, MIN_CATS } from "./state";

const COUNTS = Array.from({ length: MAX_CATS - MIN_CATS + 1 }, (_, i) => MIN_CATS + i);

/**
 * CATS step (spec 016) — the funnel's first input: how many cats to feed.
 *
 * A simple count selector that resizes the typed `cats` draft (1–4). Lands on 1
 * so the page always opens with a valid selection; the PROFILE step then collects
 * the first cat's details and the plan scales by count via the domain.
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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <ToggleButtonGroup
        exclusive
        color="primary"
        value={count}
        onChange={choose}
        aria-label={t("legend")}
        sx={{ alignSelf: "stretch", "& .MuiToggleButton-root": { flex: 1, py: 1.5, fontSize: 18 } }}
      >
        {COUNTS.map((n) => (
          <ToggleButton key={n} value={n} aria-label={t("count", { count: n })}>
            {n}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}
