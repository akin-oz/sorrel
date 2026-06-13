"use client";

import { type ReactNode, useCallback, useState } from "react";

import { useTranslations } from "next-intl";

import { FUNNEL_STEPS } from "@sorrel/shared";
import {
  AppBox,
  AppButton,
  AppCard,
  AppGrid,
  AppHeading,
  AppIconButton,
  AppProgressBar,
  AppStack,
  AppText,
  appTokens,
  sorrelTheme,
} from "@sorrel/ui";

import { Link, useRouter } from "../../../i18n/navigation";
import { LocaleSwitcher } from "../../_components/LocaleSwitcher";
import { ExitIntentModal } from "./ExitIntentModal";
import { useFunnel } from "./FunnelProvider";
import { ResumeBanner } from "./ResumeBanner";
import { WizardRail } from "./WizardRail";
import { isFirstStep, isLastStep, nextStep, prevStep, segmentForStep } from "./state";
import { useExitIntent } from "./useExitIntent";
import { stepValidity } from "./validation";

/**
 * The funnel shell (specs 016/019), composed entirely from the App* layer (spec
 * 018 — no `sx`, no raw `@mui`). One responsive surface: on mobile a single 420
 * card (top bar → progress → form); on desktop the handoff's two-pane card (1120)
 * — a full-width top bar over a `420px 1fr` grid whose left pane is the warm
 * context rail (WizardRail) and whose right pane is that same form. The step
 * heading lives in the rail on desktop and in the form on mobile (see StepShell).
 * Continue is gated on the current step's validity (spec 020).
 */
export function WizardChrome({ children }: { children: ReactNode }) {
  const { state, currentStep, track, variant, confirmed, confirm } = useFunnel();
  const router = useRouter();
  const t = useTranslations("Wizard");

  const validity = currentStep ? stepValidity(currentStep, state) : { valid: true, errors: {} };
  const stepNumber = currentStep ? FUNNEL_STEPS.indexOf(currentStep) + 1 : 0;
  const total = FUNNEL_STEPS.length;

  const handleNext = useCallback(() => {
    if (!currentStep) return;
    track({ name: "step_completed", step: currentStep, variant: variant ?? undefined });
    if (isLastStep(currentStep)) {
      confirm(); // funnel complete — SUMMARY shows the success state (spec 017)
    } else {
      router.push(`/wizard/${segmentForStep(nextStep(currentStep))}`);
    }
  }, [currentStep, track, router, variant, confirm]);

  const handleBack = useCallback(() => {
    if (!currentStep || isFirstStep(currentStep)) return;
    router.push(`/wizard/${segmentForStep(prevStep(currentStep))}`);
  }, [currentStep, router]);

  // On SUMMARY, the confirm button gives way to the success state once pressed.
  const showCta = currentStep ? !(isLastStep(currentStep) && confirmed) : false;
  const showBack = currentStep ? !isFirstStep(currentStep) : false;
  const progressLabel = t("stepProgress", { current: stepNumber, total });

  return (
    <AppStack
      direction="row"
      justifyContent="center"
      alignItems={{ xs: "stretch", md: "flex-start" }}
      minHeight="100dvh"
      p={{ xs: 0, md: 4 }}
    >
      <AppCard
        tone="paper"
        border={{ xs: false, sm: true }}
        padding={0}
        radius={{ xs: 0, sm: "24px" }}
        shadow={{ xs: false, sm: true }}
        overflow="hidden"
        direction="column"
        width="100%"
        maxWidth={{ xs: appTokens.layout.cardMaxWidth, md: appTokens.layout.pageMaxWidth }}
        minHeight={{ xs: "100dvh", sm: "auto" }}
      >
        {/* ── Top bar (full-width on desktop) ─────────────────────────────── */}
        <AppCard
          component="header"
          tone="transparent"
          border={false}
          padding={0}
          borderBottom={{ xs: false, md: true }}
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={1.5}
          minHeight={{ xs: 56, md: 76 }}
          px={{ xs: 2, md: 4 }}
          pt={{ xs: 1, md: 0 }}
        >
          <AppStack direction="row" alignItems="center" gap={1}>
            {showBack ? (
              <AppIconButton onClick={handleBack} aria-label={t("back")}>
                {/* Material "arrow_back" — inlined to avoid the @mui/icons-material dep. */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                </svg>
              </AppIconButton>
            ) : null}
            <AppHeading
              level={3}
              component={Link}
              href="/"
              fontSize={{ xs: "1.25rem", md: "1.375rem" }}
              fontWeight={700}
              color="text.primary"
              textDecoration="none"
            >
              Sorrel
            </AppHeading>
          </AppStack>

          {currentStep ? (
            <AppStack
              direction="row"
              alignItems="center"
              gap={1.75}
              display={{ xs: "none", md: "flex" }}
            >
              <AppText variant="overline" color={sorrelTheme.mono} lineHeight={1}>
                {progressLabel}
              </AppText>
              <AppProgressBar value={stepNumber} max={total} label={progressLabel} width={196} />
            </AppStack>
          ) : null}

          <AppStack direction="row" alignItems="center" justifyContent="flex-end" gap={1.5}>
            <AppBox display={{ xs: "none", md: "block" }}>
              <AppText
                component={Link}
                href="/"
                variant="body2"
                fontWeight={600}
                color="text.secondary"
                textDecoration="none"
              >
                {t("saveExit")}
              </AppText>
            </AppBox>
            <LocaleSwitcher />
          </AppStack>
        </AppCard>

        {/* Mobile progress sits below the bar, full width. */}
        {currentStep ? (
          <AppBox px={2} pt={1.75} display={{ xs: "block", md: "none" }}>
            <AppProgressBar value={stepNumber} max={total} label={progressLabel} decorative />
          </AppBox>
        ) : null}

        {/* ── Body: context rail (desktop) + form ─────────────────────────── */}
        <AppGrid columns={{ xs: "1fr", md: appTokens.layout.funnelColumns }} flex={1} minHeight={0}>
          <AppCard
            tone="page"
            border={false}
            borderRight
            padding={0}
            direction="column"
            display={{ xs: "none", md: "flex" }}
            px={6}
            py={7}
          >
            <WizardRail />
          </AppCard>

          <AppCard
            tone="paper"
            border={false}
            padding={0}
            direction="column"
            px={{ xs: 2.5, md: 7 }}
            pt={{ xs: 3, md: 7 }}
            pb={{ xs: 4, md: 7 }}
            alignItems={{ md: "center" }}
            justifyContent={{ md: "center" }}
          >
            <AppStack
              width="100%"
              maxWidth={{ md: 520 }}
              flex={{ xs: 1, md: "none" }}
              gap={{ xs: 2.75, md: 3.5 }}
            >
              <AppBox display={{ xs: "block", md: "none" }}>
                <ResumeBanner />
              </AppBox>
              {children}
              {currentStep && showCta ? (
                <AppStack mt={{ xs: "auto", md: 1 }} gap={1}>
                  <AppButton
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={handleNext}
                    disabled={!validity.valid}
                  >
                    {isLastStep(currentStep) ? t("confirm") : t("continue")}
                  </AppButton>
                  {!validity.valid ? (
                    <AppText
                      variant="body2"
                      color="text.secondary"
                      aria-live="polite"
                      align="center"
                    >
                      {t("incomplete")}
                    </AppText>
                  ) : null}
                </AppStack>
              ) : null}
            </AppStack>
          </AppCard>
        </AppGrid>
      </AppCard>

      <ExitIntentController />
    </AppStack>
  );
}

/** Arms the desktop exit-intent trigger and shows the recovery dialog once per session. */
function ExitIntentController() {
  const { currentStep, track } = useFunnel();
  const [open, setOpen] = useState(false);

  const handleTrigger = useCallback(() => {
    if (!currentStep) return;
    setOpen(true);
    track({ name: "exit_intent_shown", step: currentStep });
  }, [currentStep, track]);

  useExitIntent({
    armed: currentStep !== null && currentStep !== "SUMMARY",
    onTrigger: handleTrigger,
  });

  const handleRecover = useCallback(() => {
    if (currentStep) track({ name: "exit_intent_recovered", step: currentStep });
    setOpen(false);
  }, [currentStep, track]);

  return <ExitIntentModal open={open} onRecover={handleRecover} onLeave={() => setOpen(false)} />;
}
