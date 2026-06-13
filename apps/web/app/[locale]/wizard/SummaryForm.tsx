"use client";

import { useQuery } from "@apollo/client/react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useLocale, useTranslations } from "next-intl";

import { FunnelDraftByIdDocument } from "../../../lib/graphql/funnel";
import { useFunnel } from "./FunnelProvider";
import { toBoxFrequency } from "./draft-input";

/** "wild-caught-salmon" → "Wild-caught salmon" (display only; the slug stays canonical). */
function humanizeSlug(slug: string): string {
  const spaced = slug.replace(/-/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * SUMMARY step (spec 017) — the funnel's last step.
 *
 * A read-only review of what the user assembled. The price is the server's
 * (the recomputed `FunnelDraft.plan` from the Apollo write-path, spec 013); the
 * rest comes from client funnel state. Confirm (the chrome's last-step button)
 * flips `confirmed` and we show a success state. Graceful when data is missing —
 * each row only renders when its value is known.
 */
export function SummaryForm() {
  const t = useTranslations("Summary");
  const tPlan = useTranslations("Plan");
  const tCats = useTranslations("Cats");
  const locale = useLocale();
  const { state, draftId, confirmed } = useFunnel();

  const { data } = useQuery(FunnelDraftByIdDocument, {
    variables: { id: draftId ?? "" },
    skip: !draftId,
  });
  const plan = data?.funnelDraft?.plan ?? null;

  if (confirmed) {
    return (
      <Box
        role="status"
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 1.5,
          py: 4,
        }}
      >
        <Box sx={{ color: "primary.main" }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </Box>
        <Typography variant="h3" sx={{ fontSize: "1.5rem" }}>
          {t("successTitle")}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t("successBody")}
        </Typography>
      </Box>
    );
  }

  const frequency = toBoxFrequency(state.frequency);
  const deliveryLabel = state.deliveryDate
    ? new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      }).format(new Date(state.deliveryDate))
    : null;

  const rows: { label: string; value: string }[] = [
    { label: t("cats"), value: tCats("count", { count: state.cats.length || 1 }) },
  ];
  if (state.recipeSlugs.length > 0) {
    rows.push({ label: t("recipes"), value: state.recipeSlugs.map(humanizeSlug).join(", ") });
  }
  if (deliveryLabel) rows.push({ label: t("delivery"), value: deliveryLabel });
  if (frequency) {
    rows.push({
      label: t("frequency"),
      value: tPlan(frequency === "EVERY_2_WEEKS" ? "everyTwoWeeks" : "everyFourWeeks"),
    });
  }
  if (plan) {
    rows.push({
      label: t("price"),
      value: t("priceValue", {
        first: plan.pricing.firstBox.formatted,
        box: plan.pricing.perBox.formatted,
      }),
    });
  }
  if (state.email) rows.push({ label: t("email"), value: state.email });

  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      {rows.map((row, i) => (
        <Box
          key={row.label}
          sx={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 2,
            px: 2,
            py: 1.5,
            borderTop: i === 0 ? "none" : "1px solid",
            borderTopColor: "divider",
          }}
        >
          <Typography component="dt" variant="body2" color="text.secondary">
            {row.label}
          </Typography>
          <Typography
            component="dd"
            variant="body2"
            sx={{ m: 0, fontWeight: 600, textAlign: "right" }}
          >
            {row.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
