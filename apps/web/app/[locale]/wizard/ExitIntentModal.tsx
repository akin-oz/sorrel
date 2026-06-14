"use client";

import { useTranslations } from "next-intl";

import { AppButton, AppDialog } from "@sorrel/ui";

interface ExitIntentModalProps {
  open: boolean;
  /** User chose to stay — the recovery win. */
  onRecover: () => void;
  /** User chose to leave (button, Escape, or backdrop). */
  onLeave: () => void;
  /** The cat's name from PROFILE, when known — personalises the offer. */
  catName?: string;
}

/**
 * Exit-intent recovery modal (spec 010; reframed by spec 022) via AppDialog: focus
 * trap, Escape/backdrop close, and transitions come from the dialog. The global
 * prefers-reduced-motion rule (globals.css) collapses the transition. The copy
 * leads with the value on offer — finishing earns a free, no-commitment nutrition
 * assessment / plan preview — then keeps the progress-saved reassurance, and
 * personalises with the cat's name when known (neutral fallback otherwise).
 */
export function ExitIntentModal({ open, onRecover, onLeave, catName }: ExitIntentModalProps) {
  const t = useTranslations("ExitIntent");
  const name = catName?.trim() || t("fallbackName");
  return (
    <AppDialog
      open={open}
      onClose={onLeave}
      title={t("title")}
      body={`${t("offer", { name })} ${t("reassurance")}`}
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
