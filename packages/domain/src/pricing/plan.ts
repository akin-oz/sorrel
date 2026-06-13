/**
 * Plan + portion + pricing domain logic for the Sorrel funnel (spec 013).
 *
 * Canonical home for what used to live inline in `services/api/resolvers.ts`:
 * portion calculation, box sizing, and price derivation. Pure and unit-tested;
 * `services/api` (and any future consumer) imports these and maps them onto the
 * GraphQL enums at its boundary — it never re-implements the maths.
 *
 * The domain owns its own value types (string-union enums mirroring the schema)
 * so it stays free of any codegen dependency — generated types flow toward the
 * domain, never the other way around.
 */
import { type Money, money } from "./money";

/** Box cadence. Values mirror the GraphQL `BoxFrequency` enum members. */
export type BoxFrequency = "EVERY_2_WEEKS" | "EVERY_4_WEEKS";

/** Meals shipped per box, by cadence. A fortnightly box feeds 14 days; monthly 28. */
export const MEALS_PER_BOX: Record<BoxFrequency, number> = {
  EVERY_2_WEEKS: 14,
  EVERY_4_WEEKS: 28,
};

/** Daily food per kg of cat. The portion model's single tuning constant. */
export const GRAMS_PER_KG_PER_DAY = 30;

/** Price of one gram of food, in minor units (pence). */
export const PRICE_MINOR_PER_GRAM = 4;

/** First box is half price — the funnel's standing acquisition offer. */
export const FIRST_BOX_DISCOUNT = 0.5;

/** The only cat attribute portion size depends on. */
export interface PlanCat {
  /** Body weight in kilograms. */
  weightKg: number;
}

export interface PlanInput {
  cats: ReadonlyArray<PlanCat>;
  frequency: BoxFrequency;
}

export interface Pricing {
  perDay: Money;
  perBox: Money;
  firstBox: Money;
}

export interface Plan {
  frequency: BoxFrequency;
  /** Daily food portion in grams across all cats. */
  portionGramsPerDay: number;
  mealsPerBox: number;
  pricing: Pricing;
}

/** Total daily grams across the household, rounded to a whole gram. */
export function portionGramsPerDay(cats: ReadonlyArray<PlanCat>): number {
  return Math.round(cats.reduce((sum, cat) => sum + cat.weightKg * GRAMS_PER_KG_PER_DAY, 0));
}

/**
 * Derive the full plan — portion, box size, and the three prices — from the
 * household and chosen cadence. Deterministic: same input, same plan.
 */
export function computePlan(input: PlanInput): Plan {
  const { cats, frequency } = input;
  const mealsPerBox = MEALS_PER_BOX[frequency];
  const grams = portionGramsPerDay(cats);
  const perDayMinor = grams * PRICE_MINOR_PER_GRAM;
  const perBoxMinor = perDayMinor * mealsPerBox;

  return {
    frequency,
    portionGramsPerDay: grams,
    mealsPerBox,
    pricing: {
      perDay: money(perDayMinor),
      perBox: money(perBoxMinor),
      firstBox: money(Math.round(perBoxMinor * FIRST_BOX_DISCOUNT)),
    },
  };
}
