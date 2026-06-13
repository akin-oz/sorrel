"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";

import { sorrelTheme } from "@sorrel/ui";

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
        bgcolor: sorrelTheme.accentTint,
      }}
    >
      <Typography sx={{ fontSize: 14, lineHeight: 1.45, color: "#5E4434" }}>
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
