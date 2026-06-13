import {
  type FunnelState,
  funnelReducer,
  initialFunnelState,
  isFirstStep,
  isLastStep,
  nextStep,
  prevStep,
  stepFromSegment,
} from "./state";

describe("funnelReducer", () => {
  it("ADVANCE raises furthestStep and never lowers it", () => {
    const atRecipes = funnelReducer(initialFunnelState, { type: "ADVANCE", step: "RECIPES" });
    expect(atRecipes.furthestStep).toBe("RECIPES");

    // advancing to an earlier step does not move furthestStep backwards
    const stillRecipes = funnelReducer(atRecipes, { type: "ADVANCE", step: "PROFILE" });
    expect(stillRecipes.furthestStep).toBe("RECIPES");
  });

  it("SET_DELIVERY_DATE records the chosen date", () => {
    const next = funnelReducer(initialFunnelState, {
      type: "SET_DELIVERY_DATE",
      date: "2026-06-18",
    });
    expect(next.deliveryDate).toBe("2026-06-18");
  });

  it("SET_FREQUENCY records the chosen frequency", () => {
    const next = funnelReducer(initialFunnelState, {
      type: "SET_FREQUENCY",
      frequency: "EVERY_2_WEEKS",
    });
    expect(next.frequency).toBe("EVERY_2_WEEKS");
  });

  it("TOGGLE_RECIPE adds then removes a slug", () => {
    const added = funnelReducer(initialFunnelState, {
      type: "TOGGLE_RECIPE",
      slug: "pasture-turkey",
    });
    expect(added.recipeSlugs).toEqual(["pasture-turkey"]);
    const removed = funnelReducer(added, { type: "TOGGLE_RECIPE", slug: "pasture-turkey" });
    expect(removed.recipeSlugs).toEqual([]);
  });

  it("SET_CAT creates then merges the first cat", () => {
    const named = funnelReducer(initialFunnelState, { type: "SET_CAT", cat: { name: "Miso" } });
    expect(named.cats).toEqual([{ name: "Miso" }]);
    const aged = funnelReducer(named, { type: "SET_CAT", cat: { age: "3 years" } });
    expect(aged.cats).toEqual([{ name: "Miso", age: "3 years" }]);
  });

  it("HYDRATE replaces the whole state (resume)", () => {
    const saved: FunnelState = {
      cats: [{ name: "Biscuit" }],
      recipeSlugs: ["wild-caught-salmon"],
      deliveryDate: "2026-07-01",
      frequency: "EVERY_4_WEEKS",
      email: "owner@example.com",
      furthestStep: "PLAN",
    };
    expect(funnelReducer(initialFunnelState, { type: "HYDRATE", state: saved })).toEqual(saved);
  });

  it("RESET returns the initial state", () => {
    const dirty = funnelReducer(initialFunnelState, {
      type: "SET_DELIVERY_DATE",
      date: "2026-06-18",
    });
    expect(funnelReducer(dirty, { type: "RESET" })).toEqual(initialFunnelState);
  });

  it("never mutates the input state", () => {
    const frozen = Object.freeze({ ...initialFunnelState });
    expect(() =>
      funnelReducer(frozen, { type: "SET_DELIVERY_DATE", date: "2026-06-18" }),
    ).not.toThrow();
    expect(frozen.deliveryDate).toBeNull();
  });
});

describe("navigation helpers", () => {
  it("nextStep / prevStep walk funnel order and clamp at the ends", () => {
    expect(nextStep("CATS")).toBe("PROFILE");
    expect(prevStep("PROFILE")).toBe("CATS");
    expect(prevStep("CATS")).toBe("CATS"); // clamp at start
    expect(nextStep("SUMMARY")).toBe("SUMMARY"); // clamp at end
  });

  it("isFirstStep / isLastStep mark the boundaries", () => {
    expect(isFirstStep("CATS")).toBe(true);
    expect(isLastStep("SUMMARY")).toBe(true);
    expect(isFirstStep("DELIVERY")).toBe(false);
  });

  it("stepFromSegment resolves valid segments and rejects unknown ones", () => {
    expect(stepFromSegment("delivery")).toBe("DELIVERY");
    expect(stepFromSegment("DELIVERY")).toBe("DELIVERY");
    expect(stepFromSegment("checkout")).toBeNull();
  });
});
