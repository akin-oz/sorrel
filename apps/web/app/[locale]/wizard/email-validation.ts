/**
 * Email validation for the EMAIL step (spec 013) — pure, framework-free, so it
 * unit-tests with no Next runtime. The server action ("use server", which may
 * only export async functions) imports this; the test exercises it directly.
 */
export type EmailError = "required" | "invalid";

/** EMAIL-step form state for `useActionState`. Lives here, not in the "use server"
 *  action file — a "use server" module may only export async functions. */
export interface EmailFormState {
  status: "idle" | "ok" | "error";
  /** Echoed back so the input keeps its value across submissions. */
  email: string;
  /** Locale-agnostic error code the client maps to a localized message. */
  error?: EmailError;
}

export const initialEmailState: EmailFormState = { status: "idle", email: "" };

// Pragmatic single-line check — one @, a dot in the domain, no whitespace.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Spec 041 §7 + RFC 5321: the local + domain together cannot exceed 254 chars.
const MAX_EMAIL_LENGTH = 254;

/** Trim and validate; returns the cleaned email and an error code (or null if valid). */
export function validateEmail(raw: string): { email: string; error: EmailError | null } {
  const email = raw.trim();
  if (!email) return { email, error: "required" };
  if (email.length > MAX_EMAIL_LENGTH) return { email: "", error: "invalid" };
  if (!EMAIL_PATTERN.test(email)) return { email, error: "invalid" };
  return { email, error: null };
}
