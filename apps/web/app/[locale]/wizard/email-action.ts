"use server";

import { type EmailError, validateEmail } from "./email-validation";

/**
 * EMAIL-step server action (spec 013).
 *
 * Validation runs on the server — the deliberate contrast to the Apollo
 * mutations: a progressively-enhanced `<form action>` that works without JS, and
 * whose result drives `useActionState`. The client turns a returned error into a
 * `field_error` analytics emit. (Persistence stays with the Apollo autosave; this
 * action only validates.)
 */
export interface EmailFormState {
  status: "idle" | "ok" | "error";
  /** Echoed back so the input keeps its value across submissions. */
  email: string;
  /** Locale-agnostic error code the client maps to a localized message. */
  error?: EmailError;
}

export const initialEmailState: EmailFormState = { status: "idle", email: "" };

export async function submitEmail(
  _prev: EmailFormState,
  formData: FormData,
): Promise<EmailFormState> {
  const { email, error } = validateEmail(String(formData.get("email") ?? ""));
  if (error) return { status: "error", email, error };
  return { status: "ok", email };
}
