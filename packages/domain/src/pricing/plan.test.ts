import { formatMinor, money } from "./money";
import {
  FIRST_BOX_DISCOUNT,
  MEALS_PER_BOX,
  PRICE_MINOR_PER_GRAM,
  computePlan,
  portionGramsPerDay,
} from "./plan";

describe("money", () => {
  it("formats minor units as a £ major string", () => {
    expect(formatMinor(2408)).toBe("£24.08");
    expect(formatMinor(0)).toBe("£0.00");
    expect(formatMinor(5)).toBe("£0.05");
  });

  it("keeps amountMinor and formatted in lockstep", () => {
    const m = money(1234);
    expect(m).toEqual({ amountMinor: 1234, currency: "GBP", formatted: "£12.34" });
  });
});

describe("portionGramsPerDay", () => {
  it("sums 30g per kg across the household and rounds to a whole gram", () => {
    expect(portionGramsPerDay([{ weightKg: 4 }])).toBe(120);
    expect(portionGramsPerDay([{ weightKg: 4 }, { weightKg: 5 }])).toBe(270);
  });

  it("rounds fractional totals (4.2kg → 126g)", () => {
    expect(portionGramsPerDay([{ weightKg: 4.2 }])).toBe(126);
  });

  it("is zero for an empty household", () => {
    expect(portionGramsPerDay([])).toBe(0);
  });
});

describe("computePlan", () => {
  const oneCat = [{ weightKg: 4 }];

  it("sizes the box from the cadence", () => {
    expect(computePlan({ cats: oneCat, frequency: "EVERY_2_WEEKS" }).mealsPerBox).toBe(14);
    expect(computePlan({ cats: oneCat, frequency: "EVERY_4_WEEKS" }).mealsPerBox).toBe(28);
  });

  it("derives perBox = perDay × mealsPerBox (no rounding drift)", () => {
    const plan = computePlan({ cats: oneCat, frequency: "EVERY_4_WEEKS" });
    expect(plan.portionGramsPerDay).toBe(120);
    expect(plan.pricing.perDay.amountMinor).toBe(120 * PRICE_MINOR_PER_GRAM);
    expect(plan.pricing.perBox.amountMinor).toBe(
      plan.pricing.perDay.amountMinor * plan.mealsPerBox,
    );
  });

  it("halves the first box (acquisition offer)", () => {
    const plan = computePlan({ cats: oneCat, frequency: "EVERY_4_WEEKS" });
    expect(plan.pricing.firstBox.amountMinor).toBe(
      Math.round(plan.pricing.perBox.amountMinor * FIRST_BOX_DISCOUNT),
    );
    expect(plan.pricing.firstBox.amountMinor).toBeLessThan(plan.pricing.perBox.amountMinor);
  });

  it("echoes the chosen frequency back", () => {
    expect(computePlan({ cats: oneCat, frequency: "EVERY_2_WEEKS" }).frequency).toBe(
      "EVERY_2_WEEKS",
    );
  });

  it("prices every Money field with the GBP currency and a matching formatted string", () => {
    const { pricing } = computePlan({ cats: oneCat, frequency: "EVERY_2_WEEKS" });
    for (const m of [pricing.perDay, pricing.perBox, pricing.firstBox]) {
      expect(m.currency).toBe("GBP");
      expect(m.formatted).toBe(formatMinor(m.amountMinor));
    }
  });

  it("is deterministic — same input, same plan", () => {
    const input = {
      cats: [{ weightKg: 4.2 }, { weightKg: 5.5 }],
      frequency: "EVERY_4_WEEKS" as const,
    };
    expect(computePlan(input)).toEqual(computePlan(input));
  });

  it("MEALS_PER_BOX covers every cadence", () => {
    expect(Object.keys(MEALS_PER_BOX).sort()).toEqual(["EVERY_2_WEEKS", "EVERY_4_WEEKS"]);
  });
});
