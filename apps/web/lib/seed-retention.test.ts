import { FUNNEL_STEPS } from "@sorrel/shared";

import { RETENTION } from "./seed-retention";

/**
 * Spec 044 §2: RETENTION must have one entry per transition — i.e.
 * `FUNNEL_STEPS.length - 1`. A future `FUNNEL_STEPS` extension that omits the
 * matching curve update would otherwise re-introduce the spec 039 drift
 * (NaN at the final transition) silently.
 */
describe("seed RETENTION (spec 044 §2)", () => {
  it("variant A length matches the number of funnel transitions", () => {
    expect(RETENTION.A.length).toBe(FUNNEL_STEPS.length - 1);
  });

  it("variant B length matches the number of funnel transitions", () => {
    expect(RETENTION.B.length).toBe(FUNNEL_STEPS.length - 1);
  });

  it("every retention value is a valid probability (0 < x <= 1)", () => {
    for (const arm of ["A", "B"] as const) {
      for (const v of RETENTION[arm]) {
        expect(v).toBeGreaterThan(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});
