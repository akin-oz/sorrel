"use client";

import { type ReactNode, useCallback, useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";

import { FUNNEL_STEPS } from "@sorrel/shared";
import { appTokens, sorrelTheme } from "@sorrel/ui";

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
 * The funnel shell (specs 016/019). One responsive surface: on mobile a single
 * 420 card (top bar → progress → form); on desktop the handoff's two-pane card
 * (1120) — a full-width top bar over a `420px 1fr` grid whose left pane is the warm
 * context rail (WizardRail) and whose right pane is that same form. The step heading
 * lives in the rail on desktop and in the form on mobile (see StepShell). Continue
 * is gated on the current step's validity (spec 020).
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
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        justifyContent: "center",
        alignItems: { xs: "stretch", md: "flex-start" },
        p: { xs: 0, md: 4 },
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: { xs: appTokens.layout.cardMaxWidth, md: appTokens.layout.pageMaxWidth },
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.paper",
          borderRadius: { xs: 0, sm: "24px" },
          boxShadow: { sm: "0 24px 48px -24px rgba(46,37,32,0.3)" },
          overflow: "hidden",
          minHeight: { xs: "100dvh", sm: "auto" },
        }}
      >
        {/* ── Top bar (full-width on desktop) ─────────────────────────────── */}
        <Box
          component="header"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
            minHeight: { xs: 56, md: 76 },
            px: { xs: 2, md: 4 },
            pt: { xs: 1, md: 0 },
            borderBottom: { md: `1px solid ${sorrelTheme.cellBorder}` },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {showBack ? (
              <IconButton
                onClick={handleBack}
                aria-label={t("back")}
                sx={{ width: 44, height: 44, ml: { md: "-10px" }, color: "text.primary" }}
              >
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
              </IconButton>
            ) : null}
            <Typography
              component={Link}
              href="/"
              variant="h3"
              sx={{
                fontSize: { xs: "1.25rem", md: "1.375rem" },
                fontWeight: 700,
                color: "text.primary",
                textDecoration: "none",
              }}
            >
              Sorrel
            </Typography>
          </Box>

          {currentStep ? (
            <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1.75 }}>
              <Typography variant="overline" sx={{ color: sorrelTheme.mono, lineHeight: 1 }}>
                {progressLabel}
              </Typography>
              <StepProgress current={stepNumber} total={total} label={progressLabel} width={196} />
            </Box>
          ) : null}

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, justifyContent: "flex-end" }}>
            <Button
              component={Link}
              href="/"
              variant="text"
              sx={{
                display: { xs: "none", md: "inline-flex" },
                color: "text.secondary",
                fontWeight: 600,
              }}
            >
              {t("saveExit")}
            </Button>
            <LocaleSwitcher />
          </Box>
        </Box>

        {/* Mobile progress sits below the bar, full width. */}
        {currentStep ? (
          <Box sx={{ px: 2, pt: 1.75, display: { xs: "block", md: "none" } }}>
            <StepProgress current={stepNumber} total={total} label={progressLabel} decorative />
          </Box>
        ) : null}

        {/* ── Body: context rail (desktop) + form ─────────────────────────── */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: appTokens.layout.funnelColumns },
            flex: 1,
            minHeight: 0,
          }}
        >
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              flexDirection: "column",
              bgcolor: sorrelTheme.page,
              borderRight: `1px solid ${sorrelTheme.border}`,
              p: "56px 48px",
            }}
          >
            <WizardRail />
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              bgcolor: "background.paper",
              p: { xs: "24px 20px 32px", md: "56px" },
              alignItems: { md: "center" },
              justifyContent: { md: "center" },
            }}
          >
            <Box
              sx={{
                width: "100%",
                maxWidth: { md: 520 },
                flex: { xs: 1, md: "none" },
                display: "flex",
                flexDirection: "column",
                gap: { xs: 2.75, md: 3.5 },
              }}
            >
              <Box sx={{ display: { md: "none" } }}>
                <ResumeBanner />
              </Box>
              {children}
              {currentStep && showCta ? (
                <Box
                  sx={{
                    mt: { xs: "auto", md: 1 },
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={handleNext}
                    disabled={!validity.valid}
                  >
                    {isLastStep(currentStep) ? t("confirm") : t("continue")}
                  </Button>
                  {!validity.valid ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      aria-live="polite"
                      sx={{ textAlign: "center" }}
                    >
                      {t("incomplete")}
                    </Typography>
                  ) : null}
                </Box>
              ) : null}
            </Box>
          </Box>
        </Box>
      </Box>

      <ExitIntentController />
    </Box>
  );
}

/** The seven-segment step bar. `decorative` drops the progressbar role (the mobile
 *  copy — the role + value live on the desktop bar and the StepShell overline). */
function StepProgress({
  current,
  total,
  label,
  decorative,
  width,
}: {
  current: number;
  total: number;
  label: string;
  decorative?: boolean;
  width?: number | string;
}) {
  return (
    <Box
      role={decorative ? undefined : "progressbar"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
      aria-valuemin={decorative ? undefined : 1}
      aria-valuemax={decorative ? undefined : total}
      aria-valuenow={decorative ? undefined : current}
      sx={{ display: "flex", gap: "5px", width: width ?? "100%" }}
    >
      {FUNNEL_STEPS.map((segment, index) => (
        <Box
          key={segment}
          sx={{
            flex: 1,
            height: 4,
            borderRadius: "2px",
            bgcolor: index < current ? "primary.main" : sorrelTheme.border,
          }}
        />
      ))}
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
