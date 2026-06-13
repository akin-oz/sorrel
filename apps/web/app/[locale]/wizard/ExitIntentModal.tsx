"use client";

import { useTranslations } from "next-intl";

import { AppButton, AppDialog } from "@sorrel/ui";

interface ExitIntentModalProps {
  open: boolean;
  /** User chose to stay — the recovery win. */
  onRecover: () => void;
  /** User chose to leave (button, Escape, or backdrop). */
  onLeave: () => void;
}

/**
 * Exit-intent recovery modal (spec 010) via AppDialog: focus trap, Escape/backdrop
 * close, and transitions come from the dialog. The global prefers-reduced-motion
 * rule (globals.css) collapses the transition. Copy is brand-safe and invents
 * nothing — keyed to the local-resume already built.
 */
export function ExitIntentModal({ open, onRecover, onLeave }: ExitIntentModalProps) {
  const t = useTranslations("ExitIntent");
  return (
    <AppDialog
      open={open}
      onClose={onLeave}
      title={t("title")}
      body={t("body")}
      actions={
        <>
          <AppButton onClick={onRecover} variant="contained" size="large" fullWidth>
            {t("keepGoing")}
          </AppButton>
          <AppButton onClick={onLeave} variant="outlined" size="large" fullWidth>
            {t("leave")}
          </AppButton>
        </>
      }
    />
  );
}
