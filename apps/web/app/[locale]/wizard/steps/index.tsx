"use client";

import { type ComponentType, type ReactNode } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useLocale, useTranslations } from "next-intl";

import { FUNNEL_STEPS, type FunnelStep } from "@sorrel/shared";
import { DeliveryDatePicker, type DeliveryLabels, sorrelTheme } from "@sorrel/ui";

import type { RecipeBlok } from "../../../../types/storyblok.gen";
import { useFunnel } from "../FunnelProvider";
import { RecipesPicker } from "../RecipesPicker";

/**
 * Presentational frame shared by every step — the "Step N of 7" overline, a serif
 * title, optional subcopy (from the next-intl `Steps` catalog), and an optional
 * body. The localised copy follows the design's warm tone.
 */
function StepShell({ step, children }: { step: FunnelStep; children?: ReactNode }) {
  const tSteps = useTranslations("Steps");
  const tWizard = useTranslations("Wizard");
  const stepNumber = FUNNEL_STEPS.indexOf(step) + 1;
  const hasDescription = tSteps.has(`${step}.description`);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography variant="overline" sx={{ color: "#A8967F", lineHeight: 1.4 }}>
          {tWizard("stepProgress", { current: stepNumber, total: FUNNEL_STEPS.length })}
        </Typography>
        <Typography variant="h3" sx={{ fontSize: "1.625rem", lineHeight: 1.2 }}>
          {tSteps(`${step}.title`)}
        </Typography>
        {hasDescription ? (
          <Typography variant="body1" color="text.secondary">
            {tSteps(`${step}.description`)}
          </Typography>
        ) : null}
      </Box>
      {children}
    </Box>
  );
}

function CatsStep() {
  return <StepShell step="CATS" />;
}

function ProfileStep() {
  return <StepShell step="PROFILE" />;
}

/** RECIPES is data-driven — rendered by the step page with Storyblok recipes. */
export function RecipesStep({ recipes }: { recipes: RecipeBlok[] }) {
  return (
    <StepShell step="RECIPES">
      <RecipesPicker recipes={recipes} />
    </StepShell>
  );
}

function DeliveryStep() {
  const { state, dispatch } = useFunnel();
  const appLocale = useLocale();
  const tp = useTranslations("Picker");
  const locale = appLocale === "de" ? "de-DE" : "en-GB";
  const labels: Partial<DeliveryLabels> = {
    dialogTitle: tp("dialogTitle"),
    cancel: tp("cancel"),
    confirm: tp("confirm"),
    change: tp("change"),
    earliestDelivery: tp("earliestDelivery"),
    deliveryDate: tp("deliveryDate"),
    freeDelivery: tp("freeDelivery"),
    blockedWeekday: (weekday) => tp("blockedWeekday", { weekday }),
    beforeEarliest: (date) => tp("beforeEarliest", { date }),
  };
  return (
    <StepShell step="DELIVERY">
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <DeliveryDatePicker
          theme={sorrelTheme}
          locale={locale}
          labels={labels}
          value={state.deliveryDate ?? undefined}
          onConfirm={(iso) => dispatch({ type: "SET_DELIVERY_DATE", date: iso })}
        />
      </Box>
    </StepShell>
  );
}

function PlanStep() {
  return <StepShell step="PLAN" />;
}

function EmailStep() {
  return <StepShell step="EMAIL" />;
}

function SummaryStep() {
  return <StepShell step="SUMMARY" />;
}

/** Registry fallback — RECIPES is normally rendered data-driven by the step page. */
function RecipesPlaceholder() {
  return <StepShell step="RECIPES" />;
}

const STEP_SCREENS: Record<FunnelStep, ComponentType> = {
  CATS: CatsStep,
  PROFILE: ProfileStep,
  RECIPES: RecipesPlaceholder,
  DELIVERY: DeliveryStep,
  PLAN: PlanStep,
  EMAIL: EmailStep,
  SUMMARY: SummaryStep,
};

export function StepScreen({ step }: { step: FunnelStep }) {
  const Screen = STEP_SCREENS[step];
  return <Screen />;
}
