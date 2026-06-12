"use client";

import { type ComponentType, type ReactNode } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { FUNNEL_STEPS, type FunnelStep } from "@sorrel/shared";
import { DeliveryDatePicker, sorrelTheme } from "@sorrel/ui";

import { useFunnel } from "../FunnelProvider";

/**
 * Presentational frame shared by every step — the "STEP N OF 7" overline, a serif
 * title, optional subcopy, and an optional body. Copy follows the design's warm
 * tone; per-cat personalisation ("Tell us about Miso") lands when the forms
 * capture the name (later specs), so it is deferred, not lost.
 */
function StepShell({
  step,
  title,
  description,
  children,
}: {
  step: FunnelStep;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  const stepNumber = FUNNEL_STEPS.indexOf(step) + 1;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography variant="overline" sx={{ color: "#A8967F", lineHeight: 1.4 }}>
          Step {stepNumber} of {FUNNEL_STEPS.length}
        </Typography>
        <Typography variant="h3" sx={{ fontSize: "1.625rem", lineHeight: 1.2 }}>
          {title}
        </Typography>
        {description ? (
          <Typography variant="body1" color="text.secondary">
            {description}
          </Typography>
        ) : null}
      </Box>
      {children}
    </Box>
  );
}

function CatsStep() {
  return (
    <StepShell
      step="CATS"
      title="How many cats are we feeding?"
      description="Every bowl gets its own portion plan."
    />
  );
}

function ProfileStep() {
  return <StepShell step="PROFILE" title="Tell us about your cat" />;
}

function RecipesStep() {
  return (
    <StepShell
      step="RECIPES"
      title="Recipes your cat will love"
      description="Filtered to your cat's tastes and needs."
    />
  );
}

function DeliveryStep() {
  const { state, dispatch } = useFunnel();
  return (
    <StepShell
      step="DELIVERY"
      title="When should the first box arrive?"
      description="We picked the earliest day — change it anytime."
    >
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <DeliveryDatePicker
          theme={sorrelTheme}
          value={state.deliveryDate ?? undefined}
          onConfirm={(iso) => dispatch({ type: "SET_DELIVERY_DATE", date: iso })}
        />
      </Box>
    </StepShell>
  );
}

function PlanStep() {
  return (
    <StepShell
      step="PLAN"
      title="Your cat's plan"
      description="Portions, box size, and price — review before you commit."
    />
  );
}

function EmailStep() {
  return (
    <StepShell
      step="EMAIL"
      title="Where should we send the plan?"
      description="We'll keep your progress safe, too."
    />
  );
}

function SummaryStep() {
  return (
    <StepShell
      step="SUMMARY"
      title="Your first box"
      description="Review everything, then start your subscription."
    />
  );
}

const STEP_SCREENS: Record<FunnelStep, ComponentType> = {
  CATS: CatsStep,
  PROFILE: ProfileStep,
  RECIPES: RecipesStep,
  DELIVERY: DeliveryStep,
  PLAN: PlanStep,
  EMAIL: EmailStep,
  SUMMARY: SummaryStep,
};

export function StepScreen({ step }: { step: FunnelStep }) {
  const Screen = STEP_SCREENS[step];
  return <Screen />;
}
