"use client";

import { useQuery } from "@apollo/client/react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useLocale, useTranslations } from "next-intl";

import { sorrelTheme } from "@sorrel/ui";

import { FunnelDraftByIdDocument } from "../../../lib/graphql/funnel";
import { useFunnel } from "./FunnelProvider";
import { ResumeBanner } from "./ResumeBanner";
import { type SummaryLabels, orderSummaryRows } from "./order-summary";

// From PLAN onward the rail is the live order summary (matches the design handoff);
// before that it is contextual copy for the current step.
const SUMMARY_STEPS = new Set(["PLAN", "EMAIL", "SUMMARY"]);

/**
 * Desktop-only funnel rail (spec 019). The handoff's two-pane shell puts this warm
 * context rail on the left of the form: brand-toned step framing (the serif step
 * question → subcopy → resume note) for CATS→DELIVERY, and the live "your plan so
 * far" order summary (with the server price) from PLAN on. A reassurance line is
 * pinned to the bottom. The chrome supplies the rail's surface (page tone, padding,
 * right border) and hides it on mobile.
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
      <RailColumn>
        <Typography variant="overline" sx={{ color: sorrelTheme.mono, letterSpacing: "0.14em" }}>
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
        <Reassurance text={tRail("reassurance")} />
      </RailColumn>
    );
  }

  const hasDescription = tSteps.has(`${currentStep}.description`);
  return (
    <RailColumn>
      <Typography variant="h3" component="h2" sx={{ fontSize: "2.125rem", lineHeight: 1.15, m: 0 }}>
        {tSteps(`${currentStep}.title`)}
      </Typography>
      {hasDescription ? (
        <Typography variant="body1" color="text.secondary" sx={{ fontSize: "1rem" }}>
          {tSteps(`${currentStep}.description`)}
        </Typography>
      ) : null}
      <ResumeBanner />
      <Reassurance text={tRail("reassurance")} />
    </RailColumn>
  );
}

/** A flush, full-height column; the chrome's rail cell paints its surface. */
function RailColumn({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minHeight: "100%" }}>
      {children}
    </Box>
  );
}

/** Trust line pinned to the bottom of the rail. */
function Reassurance({ text }: { text: string }) {
  return (
    <Typography variant="body2" sx={{ mt: "auto", pt: 1, color: sorrelTheme.mono }}>
      {text}
    </Typography>
  );
}
