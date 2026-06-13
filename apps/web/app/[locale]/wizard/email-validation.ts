/**
 * Email validation for the EMAIL step (spec 013) — pure, framework-free, so it
 * unit-tests with no Next runtime. The server action ("use server", which may
 * only export async functions) imports this; the test exercises it directly.
 */
export type EmailError = "required" | "invalid";

// Pragmatic single-line check — one @, a dot in the domain, no whitespace.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trim and validate; returns the cleaned email and an error code (or null if valid). */
export function validateEmail(raw: string): { email: string; error: EmailError | null } {
  const email = raw.trim();
  if (!email) return { email, error: "required" };
  if (!EMAIL_PATTERN.test(email)) return { email, error: "invalid" };
  return { email, error: null };
}
