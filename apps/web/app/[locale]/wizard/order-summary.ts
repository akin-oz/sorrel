import { toBoxFrequency } from "./draft-input";
import type { FunnelState } from "./state";

/**
 * The "your plan so far" review rows, shared by the SUMMARY step and the desktop
 * rail (spec 017 + 019) so the two can never drift. Pure: takes funnel state, the
 * server plan, and label/format callbacks; returns rendered label/value rows.
 */

export interface OrderPlan {
  pricing: { firstBox: { formatted: string }; perBox: { formatted: string } };
}

export interface SummaryLabels {
  /** Summary-namespace row labels + the priceValue formatter. */
  label: (key: "cats" | "recipes" | "delivery" | "frequency" | "price" | "email") => string;
  priceValue: (vars: { first: string; box: string }) => string;
  /** Plan-namespace cadence label. */
  frequency: (freq: "EVERY_2_WEEKS" | "EVERY_4_WEEKS") => string;
  /** Cats-namespace pluralised count. */
  catCount: (count: number) => string;
  /** App locale ("en" | "de") for date formatting. */
  locale: string;
}

export interface SummaryRow {
  label: string;
  value: string;
}

/** "wild-caught-salmon" → "Wild-caught salmon" (display only; slug stays canonical). */
export function humanizeSlug(slug: string): string {
  const spaced = slug.replace(/-/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function orderSummaryRows(
  state: FunnelState,
  plan: OrderPlan | null,
  t: SummaryLabels,
): SummaryRow[] {
  const rows: SummaryRow[] = [
    { label: t.label("cats"), value: t.catCount(state.cats.length || 1) },
  ];

  if (state.recipeSlugs.length > 0) {
    rows.push({ label: t.label("recipes"), value: state.recipeSlugs.map(humanizeSlug).join(", ") });
  }

  if (state.deliveryDate) {
    const formatted = new Intl.DateTimeFormat(t.locale === "de" ? "de-DE" : "en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    }).format(new Date(state.deliveryDate));
    rows.push({ label: t.label("delivery"), value: formatted });
  }

  const frequency = toBoxFrequency(state.frequency);
  if (frequency) rows.push({ label: t.label("frequency"), value: t.frequency(frequency) });

  if (plan) {
    rows.push({
      label: t.label("price"),
      value: t.priceValue({
        first: plan.pricing.firstBox.formatted,
        box: plan.pricing.perBox.formatted,
      }),
    });
  }

  if (state.email) rows.push({ label: t.label("email"), value: state.email });

  return rows;
}
