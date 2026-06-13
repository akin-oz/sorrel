"use client";

import { useQuery } from "@apollo/client/react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useLocale, useTranslations } from "next-intl";

import { FunnelDraftByIdDocument } from "../../../lib/graphql/funnel";
import { useFunnel } from "./FunnelProvider";
import { type SummaryLabels, orderSummaryRows } from "./order-summary";

// From PLAN onward the rail is the live order summary (matches the design handoff);
// before that it is contextual copy for the current step.
const SUMMARY_STEPS = new Set(["PLAN", "EMAIL", "SUMMARY"]);

/**
 * Desktop-only funnel rail (spec 019). The handoff's two-column funnel puts the
 * wizard card on the left and this rail on the right: step context for CATS→DELIVERY,
 * the live "your plan so far" order summary (with the server price) from PLAN on.
 * Hidden on mobile by the chrome.
 */
export function WizardRail() {
  const { state, currentStep, draftId } = useFunnel();
  const tRail = useTranslations("Rail");
  const tSteps = useTranslations("Steps");
  const tSummary = useTranslations("Summary");
  const tPlan = useTranslations("Plan");
  const tCats = useTranslations("Cats");
  const locale = useLocale();

  const { data } = useQuery(FunnelDraftByIdDocument, {
    variables: { id: draftId ?? "" },
    skip: !draftId,
  });
  const plan = data?.funnelDraft?.plan ?? null;

  if (!currentStep) return null;

  if (SUMMARY_STEPS.has(currentStep)) {
    const labels: SummaryLabels = {
      label: (key) => tSummary(key),
      priceValue: (vars) => tSummary("priceValue", vars),
      frequency: (freq) => tPlan(freq === "EVERY_2_WEEKS" ? "everyTwoWeeks" : "everyFourWeeks"),
      catCount: (count) => tCats("count", { count }),
      locale,
    };
    const rows = orderSummaryRows(state, plan, labels);
    return (
      <RailPanel>
        <Typography variant="overline" sx={{ color: "#A8967F" }}>
          {tRail("summaryHeading")}
        </Typography>
        <Box component="dl" sx={{ m: 0, display: "flex", flexDirection: "column", gap: 1.25 }}>
          {rows.map((row) => (
            <Box
              key={row.label}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                gap: 2,
                alignItems: "baseline",
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
      </RailPanel>
    );
  }

  const hasDescription = tSteps.has(`${currentStep}.description`);
  return (
    <RailPanel>
      <Typography variant="h2" sx={{ fontSize: "1.75rem", lineHeight: 1.2 }}>
        {tSteps(`${currentStep}.title`)}
      </Typography>
      {hasDescription ? (
        <Typography variant="body1" color="text.secondary">
          {tSteps(`${currentStep}.description`)}
        </Typography>
      ) : null}
      <Typography variant="body2" sx={{ color: "#A8967F", mt: 1 }}>
        {tRail("reassurance")}
      </Typography>
    </RailPanel>
  );
}

function RailPanel({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        maxWidth: 460,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        p: 3,
        borderRadius: "20px",
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      {children}
    </Box>
  );
}
