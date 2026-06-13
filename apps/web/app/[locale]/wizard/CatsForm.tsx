"use client";

import { useEffect } from "react";

import { useTranslations } from "next-intl";

import { AppHeading, AppText, AppToggleGroup, AppToggleOption } from "@sorrel/ui";

import { useFunnel } from "./FunnelProvider";
import { MAX_CATS, MIN_CATS } from "./state";

const COUNTS = Array.from({ length: MAX_CATS - MIN_CATS + 1 }, (_, i) => MIN_CATS + i);

/**
 * CATS step (spec 016) — the funnel's first input: how many cats to feed.
 *
 * The handoff's selectable count cards: a grid (2×2 on mobile, 4-up on the desktop
 * form pane) where each card carries a big serif numeral over its unit label, and
 * the chosen one takes the accent border + tint (all from AppToggleGroup's `cards`
 * layout). Lands on 1 so the page always opens valid; PROFILE then scales the plan.
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
    <AppToggleGroup
      layout="cards"
      columns={{ xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }}
      value={count}
      onChange={choose}
      aria-label={t("legend")}
    >
      {COUNTS.map((n) => {
        const selected = count === n;
        return (
          <AppToggleOption key={n} value={n} aria-label={t("count", { count: n })}>
            <AppHeading
              level={3}
              component="span"
              fontSize={{ xs: "1.5rem", md: "1.875rem" }}
              lineHeight={1}
              color={selected ? "primary.main" : "text.primary"}
            >
              {n === MAX_CATS ? `${n}+` : n}
            </AppHeading>
            <AppText
              component="span"
              fontSize={12}
              fontWeight={600}
              color={selected ? "primary.main" : "text.secondary"}
            >
              {t("unit", { count: n })}
            </AppText>
          </AppToggleOption>
        );
      })}
    </AppToggleGroup>
  );
}
