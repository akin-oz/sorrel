"use client";

import { useActionState, useEffect } from "react";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useTranslations } from "next-intl";

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
  const { dispatch, track } = useFunnel();
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
    <Box
      component="form"
      action={formAction}
      noValidate
      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
    >
      <TextField
        name="email"
        type="email"
        label={t("label")}
        placeholder={t("placeholder")}
        defaultValue={result.email}
        error={result.status === "error"}
        helperText={result.error ? t(`error.${result.error}`) : t("hint")}
        fullWidth
      />
      <Button type="submit" variant="contained" size="large" disabled={pending}>
        {t("submit")}
      </Button>
      {result.status === "ok" ? (
        <Alert severity="success" aria-live="polite">
          {t("saved")}
        </Alert>
      ) : null}
    </Box>
  );
}
