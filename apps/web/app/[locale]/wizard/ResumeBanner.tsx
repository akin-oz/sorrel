"use client";

import { useTranslations } from "next-intl";

import { AppButton, AppCard, AppText, appTokens, sorrelTheme } from "@sorrel/ui";

import { useRouter } from "../../../i18n/navigation";
import { useFunnel } from "./FunnelProvider";
import { segmentForStep } from "./state";

/**
 * The design's "welcome back" affordance — shown on CATS when there is saved
 * progress to resume. On desktop it lives in the context rail; on mobile it sits
 * in the form card. One component, placed in both (spec 019).
 */
export function ResumeBanner() {
  const { currentStep, state } = useFunnel();
  const router = useRouter();
  const t = useTranslations("Wizard");
  if (currentStep !== "CATS" || state.furthestStep === "CATS") return null;
  return (
    <AppCard
      tone="accentTint"
      border={false}
      radius={`${appTokens.radius.surface}px`}
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      gap={1.5}
      minHeight={44}
      px={2}
      py={1.5}
    >
      <AppText fontSize={14} lineHeight={1.45} color={sorrelTheme.inkMuted}>
        {t("resumeBanner")}
      </AppText>
      <AppButton
        variant="text"
        onClick={() => router.push(`/wizard/${segmentForStep(state.furthestStep)}`)}
      >
        {t("resume")}
      </AppButton>
    </AppCard>
  );
}
