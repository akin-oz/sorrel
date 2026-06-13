import {
  BLOCKED_WEEKDAY_INDEXES,
  DEFAULT_LEAD_DAYS,
  isDeliverableWeekday,
  parseIso,
  toIso,
} from "@sorrel/domain";

import {
  BoxFrequency,
  Currency,
  DietaryProgram,
  FunnelStep,
  Fussiness,
  Weekday,
} from "./__generated__/resolvers";
import {
  DIETARY_PROGRAMS,
  blockedWeekdays,
  computeDeliveryEstimate,
  draftPlan,
  getDraft,
  saveDraft,
  updateDraft,
} from "./resolvers";

describe("computeDeliveryEstimate", () => {
  it("returns an earliest date that is a deliverable weekday", () => {
    const { earliest } = computeDeliveryEstimate();
    expect(isDeliverableWeekday(earliest)).toBe(true);
  });

  it("earliest is at least DEFAULT_LEAD_DAYS from today", () => {
    const today = parseIso(toIso(new Date()));
    const { earliest } = computeDeliveryEstimate();
    const diffDays = (parseIso(earliest).getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(DEFAULT_LEAD_DAYS);
  });

  it("blockedWeekdays matches domain BLOCKED_WEEKDAY_INDEXES translated to Weekday enum", () => {
    const INDEX_TO_WEEKDAY: ReadonlyArray<Weekday> = [
      Weekday.Monday,
      Weekday.Tuesday,
      Weekday.Wednesday,
      Weekday.Thursday,
      Weekday.Friday,
      Weekday.Saturday,
      Weekday.Sunday,
    ];
    const expected = [...BLOCKED_WEEKDAY_INDEXES]
      .sort((a, b) => a - b)
      .map((idx) => INDEX_TO_WEEKDAY[idx]);
    expect(blockedWeekdays).toEqual(expected);
  });

  it("maps blocked domain indexes (1, 4, 5) to Tuesday / Friday / Saturday", () => {
    expect(blockedWeekdays).toContain(Weekday.Tuesday);
    expect(blockedWeekdays).toContain(Weekday.Friday);
    expect(blockedWeekdays).toContain(Weekday.Saturday);
    expect(blockedWeekdays).not.toContain(Weekday.Monday);
    expect(blockedWeekdays).not.toContain(Weekday.Wednesday);
    expect(blockedWeekdays).not.toContain(Weekday.Thursday);
    expect(blockedWeekdays).not.toContain(Weekday.Sunday);
  });
});

describe("saveDraft + getDraft round-trip", () => {
  it("saves and retrieves a draft by id", () => {
    const saved = saveDraft({
      step: FunnelStep.Cats,
      recipeSlugs: ["wild-caught-salmon"],
      cats: [
        {
          name: "Mochi",
          ageMonths: 24,
          neutered: true,
          weightKg: 4.2,
          fussiness: Fussiness.Selective,
          allergies: [],
          vetConfirmationAcknowledged: false,
        },
      ],
    });

    const retrieved = getDraft(saved.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(saved.id);
    expect(retrieved!.recipeSlugs).toEqual(["wild-caught-salmon"]);
    expect(retrieved!.cats).toHaveLength(1);
    expect(retrieved!.cats[0].name).toBe("Mochi");
  });

  it("returns null for an unknown draft id", () => {
    expect(getDraft("nonexistent-id")).toBeNull();
  });
});

describe("draftPlan (FunnelDraft.plan recompute)", () => {
  const cat = {
    id: "c1",
    name: "Mochi",
    ageMonths: 24,
    neutered: true,
    weightKg: 4,
    fussiness: Fussiness.Selective,
    allergies: [],
    dietaryProgram: null,
    vetConfirmed: false,
  };

  it("is null until a frequency is chosen", () => {
    expect(draftPlan({ cats: [cat], frequency: null })).toBeNull();
  });

  it("is null when there are no cats", () => {
    expect(draftPlan({ cats: [], frequency: BoxFrequency.Every_2Weeks })).toBeNull();
  });

  it("recomputes price + portion from cats and frequency", () => {
    const plan = draftPlan({ cats: [cat], frequency: BoxFrequency.Every_4Weeks });
    expect(plan).not.toBeNull();
    expect(plan!.frequency).toBe(BoxFrequency.Every_4Weeks);
    expect(plan!.mealsPerBox).toBe(28);
    expect(plan!.portionGramsPerDay).toBe(120); // 4kg × 30g
    expect(plan!.pricing.perBox.currency).toBe(Currency.Gbp);
    expect(plan!.pricing.firstBox.amountMinor).toBeLessThan(plan!.pricing.perBox.amountMinor);
  });

  it("updateDraft → the plan tracks the new frequency (the optimistic-preview path)", () => {
    const draft = saveDraft({
      step: FunnelStep.Plan,
      recipeSlugs: ["wild-caught-salmon"],
      frequency: BoxFrequency.Every_4Weeks,
      cats: [
        {
          name: "Mochi",
          ageMonths: 24,
          neutered: true,
          weightKg: 4,
          fussiness: Fussiness.Selective,
          allergies: [],
          vetConfirmationAcknowledged: false,
        },
      ],
    });
    const monthly = draftPlan(draft);
    expect(monthly!.mealsPerBox).toBe(28);

    const updated = updateDraft(draft.id, {
      cats: [],
      recipeSlugs: ["wild-caught-salmon"],
      frequency: BoxFrequency.Every_2Weeks,
    });
    const fortnightly = draftPlan(updated);
    expect(fortnightly!.mealsPerBox).toBe(14);
    // half the meals → half the box price
    expect(fortnightly!.pricing.perBox.amountMinor).toBe(monthly!.pricing.perBox.amountMinor / 2);
  });
});

describe("DIETARY_PROGRAMS", () => {
  it("returns all three programs", () => {
    expect(DIETARY_PROGRAMS).toHaveLength(3);
  });

  it("marks RENAL_SUPPORT as requiresVetConfirmation", () => {
    const renal = DIETARY_PROGRAMS.find((p) => p.program === DietaryProgram.RenalSupport);
    expect(renal?.requiresVetConfirmation).toBe(true);
  });

  it("marks PLANT_BASED as requiresVetConfirmation", () => {
    const plant = DIETARY_PROGRAMS.find((p) => p.program === DietaryProgram.PlantBased);
    expect(plant?.requiresVetConfirmation).toBe(true);
  });

  it("does NOT mark NOVEL_PROTEIN as requiresVetConfirmation", () => {
    const novel = DIETARY_PROGRAMS.find((p) => p.program === DietaryProgram.NovelProtein);
    expect(novel?.requiresVetConfirmation).toBe(false);
  });
});
