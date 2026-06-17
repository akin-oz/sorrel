import { ApolloServer } from "@apollo/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  BLOCKED_WEEKDAY_INDEXES,
  DEFAULT_LEAD_DAYS,
  isDeliverableWeekday,
  parseIso,
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
  clearDrafts,
  computeDeliveryEstimate,
  draftPlan,
  getDraft,
  resolvers,
  saveDraft,
  updateDraft,
} from "./resolvers";

// Avoid importing `./schema.ts` here — it uses `import.meta.url` which ts-jest's
// CommonJS module target doesn't support. Read the SDL directly instead.
const typeDefs = readFileSync(join(__dirname, "..", "..", "..", "schema.graphql"), "utf8");

// ─── Cross-test isolation ─────────────────────────────────────────────────────
// The in-memory `drafts` Map is module-level state shared across all tests in
// this file. Without a reset, a draft saved in an earlier `it` block is visible
// to every later test — making the order of execution matter and masking bugs
// where a draft should have been absent. `clearDrafts()` is exposed by
// `resolvers.ts` specifically for this purpose (spec 044).
beforeEach(() => {
  clearDrafts();
});

describe("computeDeliveryEstimate", () => {
  it("returns an earliest date that is a deliverable weekday", () => {
    const { earliest } = computeDeliveryEstimate();
    expect(isDeliverableWeekday(earliest)).toBe(true);
  });

  it("earliest is at least DEFAULT_LEAD_DAYS from the injected today (spec 044 §1)", () => {
    // Pin the clock — no `new Date()` in the assertion path, so a CI run
    // crossing midnight between two reads can't red the test.
    const todayIso = "2026-06-12";
    const today = parseIso(todayIso);
    const { earliest } = computeDeliveryEstimate(todayIso);
    const diffDays = (parseIso(earliest).getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(DEFAULT_LEAD_DAYS);
  });

  it("honours an injected todayIso (spec 044 §1)", () => {
    // 2026-01-05 is a Monday; +3 days is Thursday 2026-01-08 (deliverable).
    expect(computeDeliveryEstimate("2026-01-05").earliest).toBe("2026-01-08");
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

  it("updateDraft preserves existing cats (plan input cats are for recompute only)", () => {
    // `updateDraft` receives a `PlanInput` whose `cats` field is the optimistic
    // recompute input — it is NOT used to overwrite the stored cat list.
    // The resolver spreads `...existing` and ignores `input.cats`, so passing
    // a different cat weight must NOT change the draft's stored cats field.
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

    // Pass a cat with a wildly different weight in the PlanInput.
    const updated = updateDraft(draft.id, {
      cats: [
        {
          name: "Phantom Cat",
          ageMonths: 12,
          neutered: false,
          weightKg: 99,
          fussiness: Fussiness.Selective,
          allergies: [],
          vetConfirmationAcknowledged: false,
        },
      ],
      recipeSlugs: ["wild-caught-salmon"],
      frequency: BoxFrequency.Every_2Weeks,
    });

    // The stored cats must still be the original Mochi — the PlanInput cats
    // are ignored by updateDraft (it uses ...existing to preserve the cat list).
    expect(updated.cats).toHaveLength(1);
    expect(updated.cats[0].name).toBe("Mochi");
    expect(updated.cats[0].weightKg).toBe(4);
  });
});

describe("input length caps (spec 041 §2)", () => {
  const baseCat = {
    name: "Mochi",
    ageMonths: 24,
    neutered: true,
    weightKg: 4,
    fussiness: Fussiness.Selective,
    allergies: [],
    vetConfirmationAcknowledged: false,
  };

  it("rejects email longer than 254 chars", () => {
    expect(() =>
      saveDraft({
        step: FunnelStep.Email,
        email: `${"x".repeat(243)}@example.com`, // length 255
      }),
    ).toThrow();
  });

  it("rejects a cat name longer than 80 chars", () => {
    expect(() =>
      saveDraft({
        step: FunnelStep.Cats,
        cats: [{ ...baseCat, name: "x".repeat(81) }],
      }),
    ).toThrow();
  });

  it("rejects more than 20 cats", () => {
    const cats = Array.from({ length: 21 }, (_, i) => ({ ...baseCat, name: `cat-${i}` }));
    expect(() => saveDraft({ step: FunnelStep.Cats, cats })).toThrow();
  });

  it("rejects more than 20 recipe slugs", () => {
    const recipeSlugs = Array.from({ length: 21 }, (_, i) => `slug-${i}`);
    expect(() => saveDraft({ step: FunnelStep.Recipes, recipeSlugs })).toThrow();
  });
});

describe("GraphQL wiring (spec 044 §4)", () => {
  function newServer(): ApolloServer {
    return new ApolloServer({ typeDefs, resolvers });
  }

  it("funnelDraft query returns a saved draft via the resolver layer", async () => {
    const saved = saveDraft({
      step: FunnelStep.Cats,
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

    const server = newServer();
    const response = await server.executeOperation({
      query: `query F($id: ID!) { funnelDraft(id: $id) { id step } }`,
      variables: { id: saved.id },
    });

    expect(response.body.kind).toBe("single");
    if (response.body.kind !== "single") return;
    expect(response.body.singleResult.errors).toBeUndefined();
    expect(response.body.singleResult.data?.funnelDraft).toMatchObject({
      id: saved.id,
      step: FunnelStep.Cats,
    });
  });

  it("updateFunnelPlan mutation recomputes pricing through the resolver layer", async () => {
    const saved = saveDraft({
      step: FunnelStep.Plan,
      recipeSlugs: ["wild-caught-salmon"],
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

    const server = newServer();
    const response = await server.executeOperation({
      query: `
        mutation U($draftId: ID!, $input: PlanInput!) {
          updateFunnelPlan(draftId: $draftId, input: $input) {
            plan {
              frequency
              mealsPerBox
              pricing { perDay { amountMinor currency } }
            }
          }
        }
      `,
      variables: {
        draftId: saved.id,
        input: {
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
          recipeSlugs: ["wild-caught-salmon"],
          frequency: BoxFrequency.Every_2Weeks,
        },
      },
    });

    expect(response.body.kind).toBe("single");
    if (response.body.kind !== "single") return;
    expect(response.body.singleResult.errors).toBeUndefined();
    const plan = (
      response.body.singleResult.data?.updateFunnelPlan as { plan: { mealsPerBox: number } } | null
    )?.plan;
    expect(plan?.mealsPerBox).toBe(14);
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
