"use client";

import { type ComponentType, type ReactNode } from "react";

import { useLocale, useTranslations } from "next-intl";

import { FUNNEL_STEPS, type FunnelStep } from "@sorrel/shared";
import {
  AppHeading,
  AppStack,
  AppText,
  DeliveryDatePicker,
  type DeliveryLabels,
  sorrelTheme,
} from "@sorrel/ui";

import type { RecipeBlok } from "../../../../types/storyblok.gen";
import { CatsForm } from "../CatsForm";
import { CheckoutForm } from "../CheckoutForm";
import { EmailForm } from "../EmailForm";
import { useFunnel } from "../FunnelProvider";
import { PlanForm } from "../PlanForm";
import { ProfileForm } from "../ProfileForm";
import { RecipesPicker } from "../RecipesPicker";
import { SummaryForm } from "../SummaryForm";

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
    <AppStack gap={2.5}>
      {/* On desktop the heading lives in the left rail (WizardRail); here it shows
          on mobile only, where there is no rail. */}
      <AppStack display={{ xs: "flex", md: "none" }} gap={1}>
        <AppText variant="overline" color={sorrelTheme.inkMuted} lineHeight={1.4}>
          {tWizard("stepProgress", { current: stepNumber, total: FUNNEL_STEPS.length })}
        </AppText>
        <AppHeading level={3} fontSize="1.625rem" lineHeight={1.2}>
          {tSteps(`${step}.title`)}
        </AppHeading>
        {hasDescription ? (
          <AppText color="text.secondary">{tSteps(`${step}.description`)}</AppText>
        ) : null}
      </AppStack>
      {children}
    </AppStack>
  );
}

function CatsStep() {
  return (
    <StepShell step="CATS">
      <CatsForm />
    </StepShell>
  );
}

function ProfileStep() {
  return (
    <StepShell step="PROFILE">
      <ProfileForm />
    </StepShell>
  );
}

/** RECIPES is data-driven — rendered by the step page with Storyblok recipes. */
export function RecipesStep({ recipes }: { recipes: RecipeBlok[] }) {
  return (
    <StepShell step="RECIPES">
      <RecipesPicker recipes={recipes} />
    </StepShell>
  );
}

function DeliveryStep({ today }: StepProps = {}) {
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
      <AppStack direction="row" justifyContent="center">
        <DeliveryDatePicker
          today={today}
          theme={sorrelTheme}
          locale={locale}
          labels={labels}
          value={state.deliveryDate ?? undefined}
          onConfirm={(iso) => dispatch({ type: "SET_DELIVERY_DATE", date: iso })}
        />
      </AppStack>
    </StepShell>
  );
}

function PlanStep() {
  return (
    <StepShell step="PLAN">
      <PlanForm />
    </StepShell>
  );
}

function EmailStep() {
  return (
    <StepShell step="EMAIL">
      <EmailForm />
    </StepShell>
  );
}

function SummaryStep() {
  return (
    <StepShell step="SUMMARY">
      <SummaryForm />
    </StepShell>
  );
}

function CheckoutStep() {
  return (
    <StepShell step="CHECKOUT">
      <CheckoutForm />
    </StepShell>
  );
}

/** Registry fallback — RECIPES is normally rendered data-driven by the step page. */
function RecipesPlaceholder() {
  return <StepShell step="RECIPES" />;
}

/** Spec 034: `today` flows from the server page so DeliveryStep can pass an
 *  SSR-stable seed to the picker. Other steps accept (and ignore) the prop. */
interface StepProps {
  today?: string;
}

const STEP_SCREENS: Record<FunnelStep, ComponentType<StepProps>> = {
  CATS: CatsStep,
  PROFILE: ProfileStep,
  RECIPES: RecipesPlaceholder,
  DELIVERY: DeliveryStep,
  PLAN: PlanStep,
  EMAIL: EmailStep,
  SUMMARY: SummaryStep,
  CHECKOUT: CheckoutStep,
};

export function StepScreen({ step, today }: { step: FunnelStep; today?: string }) {
  const Screen = STEP_SCREENS[step];
  return <Screen today={today} />;
}
