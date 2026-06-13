/**
 * Money in the Sorrel domain (spec 013).
 *
 * Amounts are integer minor units (pence) — never floats — so arithmetic never
 * drifts. `formatted` is the display string the GraphQL `Money.formatted` field
 * mirrors. Pure: no I/O, unit-tested in isolation.
 */

/** Currencies the funnel prices in. Single currency today; widen here, not inline. */
export type CurrencyCode = "GBP";

const CURRENCY_SYMBOL: Record<CurrencyCode, string> = {
  GBP: "£",
};

export interface Money {
  /** Amount in the currency's minor unit; 2408 means £24.08. */
  amountMinor: number;
  currency: CurrencyCode;
  /** Display string including the currency symbol, e.g. £24.08. */
  formatted: string;
}

/** Format an integer minor amount as a symbol-prefixed major string. */
export function formatMinor(amountMinor: number, currency: CurrencyCode = "GBP"): string {
  return `${CURRENCY_SYMBOL[currency]}${(amountMinor / 100).toFixed(2)}`;
}

/** Build a `Money` from an integer minor amount. The only constructor — keeps
 * `formatted` and `amountMinor` from ever disagreeing. */
export function money(amountMinor: number, currency: CurrencyCode = "GBP"): Money {
  return { amountMinor, currency, formatted: formatMinor(amountMinor, currency) };
}
