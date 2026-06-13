import { type FunnelState, initialFunnelState } from "./state";
import { stepValidity } from "./validation";

function state(overrides: Partial<FunnelState>): FunnelState {
  return { ...initialFunnelState, ...overrides };
}

describe("stepValidity", () => {
  it("CATS is always valid", () => {
    expect(stepValidity("CATS", initialFunnelState).valid).toBe(true);
  });

  it("PROFILE requires name, age, and weight", () => {
    expect(stepValidity("PROFILE", state({ cats: [{ name: "" }] }))).toEqual({
      valid: false,
      errors: { name: "required", age: "required", weight: "required" },
    });
    expect(
      stepValidity("PROFILE", state({ cats: [{ name: "Miso", age: "young", weight: "m" }] })).valid,
    ).toBe(true);
    // a filled name but missing weight is still invalid
    expect(
      stepValidity("PROFILE", state({ cats: [{ name: "Miso", age: "young" }] })).errors,
    ).toEqual({ weight: "required" });
  });

  it("RECIPES requires at least one recipe", () => {
    expect(stepValidity("RECIPES", state({ recipeSlugs: [] }))).toEqual({
      valid: false,
      errors: { recipes: "min" },
    });
    expect(stepValidity("RECIPES", state({ recipeSlugs: ["wild-caught-salmon"] })).valid).toBe(
      true,
    );
  });

  it("DELIVERY requires a date", () => {
    expect(stepValidity("DELIVERY", state({ deliveryDate: null })).valid).toBe(false);
    expect(stepValidity("DELIVERY", state({ deliveryDate: "2026-06-18" })).valid).toBe(true);
  });

  it("PLAN requires a frequency", () => {
    expect(stepValidity("PLAN", state({ frequency: null })).valid).toBe(false);
    expect(stepValidity("PLAN", state({ frequency: "EVERY_2_WEEKS" })).valid).toBe(true);
  });

  it("EMAIL requires a syntactically valid email (shared with the server rule)", () => {
    expect(stepValidity("EMAIL", state({ email: null })).errors).toEqual({ email: "required" });
    expect(stepValidity("EMAIL", state({ email: "nope" })).errors).toEqual({ email: "invalid" });
    expect(stepValidity("EMAIL", state({ email: "owner@example.com" })).valid).toBe(true);
  });

  it("SUMMARY is valid only when every prior step is valid", () => {
    expect(stepValidity("SUMMARY", initialFunnelState).valid).toBe(false);
    const complete = state({
      cats: [{ name: "Miso", age: "young", weight: "m" }],
      recipeSlugs: ["wild-caught-salmon"],
      deliveryDate: "2026-06-18",
      frequency: "EVERY_2_WEEKS",
      email: "owner@example.com",
    });
    expect(stepValidity("SUMMARY", complete).valid).toBe(true);
  });
});
