"use server";

import { type EmailFormState, validateEmail } from "./email-validation";

/**
 * EMAIL-step server action (spec 013). A "use server" module may only export
 * async functions, so the form-state type + initial value live in
 * email-validation.ts; this file exports only the action.
 *
 * Validation runs on the server — the deliberate contrast to the Apollo
 * mutations: a progressively-enhanced `<form action>` that works without JS, and
 * whose result drives `useActionState`. The client turns a returned error into a
 * `field_error` analytics emit. (Persistence stays with the Apollo autosave; this
 * action only validates.)
 */
export async function submitEmail(
  _prev: EmailFormState,
  formData: FormData,
): Promise<EmailFormState> {
  const { email, error } = validateEmail(String(formData.get("email") ?? ""));
  if (error) return { status: "error", email, error };
  return { status: "ok", email };
}
