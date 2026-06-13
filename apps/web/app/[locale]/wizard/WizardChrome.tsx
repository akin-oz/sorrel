"use client";

import { type ReactNode, useCallback, useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";

import { FUNNEL_STEPS } from "@sorrel/shared";

import { useRouter } from "../../../i18n/navigation";
import { ExitIntentModal } from "./ExitIntentModal";
import { useFunnel } from "./FunnelProvider";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { isFirstStep, isLastStep, nextStep, prevStep, segmentForStep } from "./state";
import { useExitIntent } from "./useExitIntent";

const INACTIVE_SEGMENT = "#E3D8C8";

export function WizardChrome({ children }: { children: ReactNode }) {
  const { currentStep, track, variant, confirmed, confirm } = useFunnel();
  const router = useRouter();
  const t = useTranslations("Wizard");

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

  // On SUMMARY, the confirm button gives way to the success state once pressed.
  const showCta = currentStep ? !(isLastStep(currentStep) && confirmed) : false;

  const handleBack = useCallback(() => {
    if (!currentStep || isFirstStep(currentStep)) return;
    router.push(`/wizard/${segmentForStep(prevStep(currentStep))}`);
  }, [currentStep, router]);

  const showBack = currentStep ? !isFirstStep(currentStep) : false;

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        justifyContent: "center",
        alignItems: { xs: "stretch", sm: "flex-start" },
        p: { xs: 0, sm: 3 },
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 420,
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.paper",
          borderRadius: { xs: 0, sm: "24px" },
          boxShadow: { sm: "0 24px 48px -24px rgba(46,37,32,0.3)" },
          overflow: "hidden",
          minHeight: { xs: "100dvh", sm: "auto" },
        }}
      >
        <Box sx={{ px: 2.5, pt: 2, display: "flex", flexDirection: "column", gap: 1.75 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: 44,
            }}
          >
            <Box sx={{ width: 44 }}>
              {showBack ? (
                <IconButton
                  onClick={handleBack}
                  aria-label={t("back")}
                  sx={{ width: 44, height: 44, color: "text.primary" }}
                >
                  {/* Material Design "arrow_back" — inlined to avoid the @mui/icons-material dep. */}
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                  </svg>
                </IconButton>
              ) : null}
            </Box>
            <Typography variant="h3" component="span" sx={{ fontSize: "1.25rem", fontWeight: 700 }}>
              Sorrel
            </Typography>
            <LocaleSwitcher />
          </Box>

          {currentStep ? (
            <Box
              role="progressbar"
              aria-label={t("stepProgress", { current: stepNumber, total })}
              aria-valuemin={1}
              aria-valuemax={total}
              aria-valuenow={stepNumber}
              sx={{ display: "flex", gap: "5px" }}
            >
              {FUNNEL_STEPS.map((segment, index) => (
                <Box
                  key={segment}
                  sx={{
                    flex: 1,
                    height: 4,
                    borderRadius: "2px",
                    bgcolor: index < stepNumber ? "primary.main" : INACTIVE_SEGMENT,
                  }}
                />
              ))}
            </Box>
          ) : null}
        </Box>

        <Box
          sx={{
            px: 2.5,
            pt: 3,
            pb: 3.5,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 2.75,
          }}
        >
          <ResumeBanner />
          {children}
          {currentStep && showCta ? (
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleNext}
              sx={{ mt: "auto" }}
            >
              {isLastStep(currentStep) ? t("confirm") : t("continue")}
            </Button>
          ) : null}
        </Box>
      </Box>

      <ExitIntentController />
    </Box>
  );
}

/** Design's "welcome back" affordance — shown on CATS when there is progress to resume. */
function ResumeBanner() {
  const { currentStep, state } = useFunnel();
  const router = useRouter();
  const t = useTranslations("Wizard");
  if (currentStep !== "CATS" || state.furthestStep === "CATS") return null;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.5,
        minHeight: 44,
        px: 2,
        py: 1.5,
        borderRadius: "14px",
        bgcolor: "#F4E3D8",
      }}
    >
      <Typography sx={{ fontSize: 13, lineHeight: 1.45, color: "#5E4434" }}>
        {t("resumeBanner")}
      </Typography>
      <Button
        variant="text"
        onClick={() => router.push(`/wizard/${segmentForStep(state.furthestStep)}`)}
        sx={{
          minWidth: 0,
          p: "8px 4px",
          color: "primary.main",
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        {t("resume")}
      </Button>
    </Box>
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
