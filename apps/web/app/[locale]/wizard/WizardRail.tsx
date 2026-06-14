"use client";

import { useQuery } from "@apollo/client/react";
import { useLocale, useTranslations } from "next-intl";

import { AppBox, AppHeading, AppStack, AppText, sorrelTheme } from "@sorrel/ui";

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
        <AppText variant="overline" color={sorrelTheme.inkMuted} lineHeight={1.4}>
          {tRail("summaryHeading")}
        </AppText>
        <AppStack component="dl" m={0} gap={1.25}>
          {rows.map((row) => (
            <AppStack
              key={row.label}
              direction="row"
              justifyContent="space-between"
              alignItems="baseline"
              gap={2}
            >
              <AppText component="dt" variant="body2" color="text.secondary">
                {row.label}
              </AppText>
              <AppText component="dd" variant="body2" fontWeight={600} align="right">
                {row.value}
              </AppText>
            </AppStack>
          ))}
        </AppStack>
        <Reassurance text={tRail("reassurance")} />
      </RailColumn>
    );
  }

  const hasDescription = tSteps.has(`${currentStep}.description`);
  return (
    <RailColumn>
      <AppHeading level={3} component="h2" fontSize="2.125rem" lineHeight={1.15}>
        {tSteps(`${currentStep}.title`)}
      </AppHeading>
      {hasDescription ? (
        <AppText color="text.secondary" fontSize="1rem">
          {tSteps(`${currentStep}.description`)}
        </AppText>
      ) : null}
      <ResumeBanner />
      <Reassurance text={tRail("reassurance")} />
    </RailColumn>
  );
}

/** A flush, full-height column; the chrome's rail cell paints its surface. */
function RailColumn({ children }: { children: React.ReactNode }) {
  return (
    <AppStack gap={3} flex={1} minHeight="100%">
      {children}
    </AppStack>
  );
}

/** Trust line pinned to the bottom of the rail. */
function Reassurance({ text }: { text: string }) {
  return (
    <AppBox mt="auto" pt={1}>
      <AppText variant="body2" color={sorrelTheme.inkMuted}>
        {text}
      </AppText>
    </AppBox>
  );
}
