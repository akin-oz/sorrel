"use client";

import { useActionState, useEffect } from "react";

import { useTranslations } from "next-intl";

import { AppAlert, AppButton, AppField, AppStack } from "@sorrel/ui";

import { useFunnel } from "./FunnelProvider";
import { submitEmail } from "./email-action";
import { type EmailFormState, initialEmailState } from "./email-validation";

/**
 * EMAIL step (spec 013) — `useActionState` over a server action.
 *
 * The `<form action>` posts to a server action that validates server-side; the
 * returned state drives the field's error UI. A server-side validation failure
 * becomes a client `field_error` emit (the spec-009 contract); a success commits
 * the email to wizard state, where the Apollo autosave persists it. Validation on
 * the server, persistence via Apollo — the two write paths, side by side.
 */
export function EmailForm() {
  const t = useTranslations("Email");
  const { dispatch, track, state } = useFunnel();
  const [result, formAction, pending] = useActionState<EmailFormState, FormData>(
    submitEmail,
    initialEmailState,
  );

  useEffect(() => {
    if (result.status === "error" && result.error) {
      track({ name: "field_error", step: "EMAIL", field: "email", error: result.error });
    } else if (result.status === "ok") {
      dispatch({ type: "SET_EMAIL", email: result.email });
    }
  }, [result, track, dispatch]);

  return (
    <form action={formAction} noValidate>
      <AppStack gap={2}>
        <AppField
          name="email"
          type="email"
          label={t("label")}
          placeholder={t("placeholder")}
          defaultValue={result.email || state.email || ""}
          error={result.status === "error"}
          helperText={result.error ? t(`error.${result.error}`) : t("hint")}
          fullWidth
        />
        <AppButton type="submit" variant="contained" size="large" disabled={pending}>
          {t("submit")}
        </AppButton>
        {result.status === "ok" ? (
          <AppAlert severity="success" aria-live="polite">
            {t("saved")}
          </AppAlert>
        ) : null}
      </AppStack>
    </form>
  );
}
