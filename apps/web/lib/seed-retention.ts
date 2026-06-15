/**
 * Shared per-transition retention curve for the three seed scripts (spec 044 §2).
 *
 * One source of truth eliminates the drift that spec 039 hit — `FUNNEL_STEPS` grew
 * by one (added CHECKOUT) while the seed scripts kept 6 transitions, producing NaN
 * at the final step until spec 043 fixed all three at once. The seed-retention test
 * in this directory now locks `RETENTION.A.length === FUNNEL_STEPS.length - 1`, so a
 * future `FUNNEL_STEPS` addition reds CI immediately if the curve isn't extended.
 *
 * Index i is the FUNNEL_STEPS[i] → FUNNEL_STEPS[i+1] retention. The lever is
 * index 1 (PROFILE → RECIPES): inline pills (A, every option visible) vs
 * autocomplete-with-smart-defaults (B). A is a credible control, so the gap is
 * real but small. SUMMARY → CHECKOUT (index 6) is equal across arms — the A/B
 * lever is PROFILE, not the Stripe commit step (spec 043 Decision A).
 */

export type SeedVariant = "A" | "B";

export const RETENTION: Record<SeedVariant, ReadonlyArray<number>> = {
  A: [0.82, 0.7, 0.81, 0.89, 0.86, 0.91, 0.75],
  B: [0.82, 0.78, 0.81, 0.89, 0.86, 0.91, 0.75],
};
