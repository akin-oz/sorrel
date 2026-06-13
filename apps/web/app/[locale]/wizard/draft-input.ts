/**
 * Adapt the client wizard state to the GraphQL `SaveFunnelDraftInput` (spec 013).
 *
 * The wizard (specs 010/014) collects less than `CatInput` requires: name plus an
 * age/weight *bucket* (arm B) or free text (arm A). The richer schema fields are
 * filled with documented defaults below. The plan depends only on `weightKg` and
 * `frequency`, so these defaults never change the price the funnel shows — they
 * exist solely to satisfy the schema's non-null inputs.
 */
import type {
  BoxFrequency,
  CatInput,
  FunnelStep,
  PlanInput,
  SaveFunnelDraftInput,
} from "../../../lib/gql/graphql";
import type { CatDraft, FunnelState } from "./state";

/** Representative kg per weight bucket; midpoints of the PROFILE arm-B ranges. */
const WEIGHT_KG: Record<string, number> = { s: 3.5, m: 4.5, l: 5.5, xl: 6.5 };
/** Representative age in months per age bucket. */
const AGE_MONTHS: Record<string, number> = { kitten: 6, young: 24, adult: 60, senior: 108 };

const DEFAULT_WEIGHT_KG = 4.5;
const DEFAULT_AGE_MONTHS = 24;

/** Bucket key → kg, or parse free-text ("4.2 kg" / "4,2"); fall back to the median. */
export function weightToKg(weight: string | undefined): number {
  if (!weight) return DEFAULT_WEIGHT_KG;
  if (weight in WEIGHT_KG) return WEIGHT_KG[weight];
  const parsed = Number.parseFloat(weight.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_WEIGHT_KG;
}

/** Bucket key → months, or parse free-text years ("3 years"); fall back to the median. */
export function ageToMonths(age: string | undefined): number {
  if (!age) return DEFAULT_AGE_MONTHS;
  if (age in AGE_MONTHS) return AGE_MONTHS[age];
  const years = Number.parseFloat(age.replace(",", "."));
  return Number.isFinite(years) && years > 0 ? Math.round(years * 12) : DEFAULT_AGE_MONTHS;
}

const FREQUENCIES: ReadonlySet<string> = new Set(["EVERY_2_WEEKS", "EVERY_4_WEEKS"]);

/** Narrow the wizard's stored frequency string to the schema enum, or null. */
export function toBoxFrequency(frequency: string | null): BoxFrequency | null {
  return frequency && FREQUENCIES.has(frequency) ? (frequency as BoxFrequency) : null;
}

export function toCatInput(cat: CatDraft): CatInput {
  return {
    name: cat.name.trim() || "Your cat",
    ageMonths: ageToMonths(cat.age),
    weightKg: weightToKg(cat.weight),
    // Not collected by the wizard; defaults satisfy the schema and don't affect pricing.
    neutered: true,
    fussiness: "EATS_ANYTHING",
    allergies: [],
    vetConfirmationAcknowledged: false,
  };
}

/** Build the autosave input from the current wizard state. */
export function toSaveFunnelDraftInput(
  state: FunnelState,
  step: FunnelStep,
  id: string | null,
): SaveFunnelDraftInput {
  return {
    id: id ?? undefined,
    step,
    cats: state.cats.map(toCatInput),
    recipeSlugs: state.recipeSlugs,
    deliveryDate: state.deliveryDate,
    frequency: toBoxFrequency(state.frequency),
    email: state.email,
  };
}

/** Build the `updateFunnelPlan` input for a chosen cadence (the PLAN-step toggle). */
export function toPlanInput(state: FunnelState, frequency: BoxFrequency): PlanInput {
  return {
    cats: state.cats.map(toCatInput),
    recipeSlugs: state.recipeSlugs,
    frequency,
  };
}
