"use client";

import { useQuery } from "@apollo/client/react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useLocale, useTranslations } from "next-intl";

import { FunnelDraftByIdDocument } from "../../../lib/graphql/funnel";
import { useFunnel } from "./FunnelProvider";
import { type SummaryLabels, orderSummaryRows } from "./order-summary";

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

  const labels: SummaryLabels = {
    label: (key) => t(key),
    priceValue: (vars) => t("priceValue", vars),
    frequency: (freq) => tPlan(freq === "EVERY_2_WEEKS" ? "everyTwoWeeks" : "everyFourWeeks"),
    catCount: (count) => tCats("count", { count }),
    locale,
  };
  const rows = orderSummaryRows(state, plan, labels);

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
