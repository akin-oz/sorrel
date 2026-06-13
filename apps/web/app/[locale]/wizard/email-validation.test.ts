import { validateEmail } from "./email-validation";

describe("validateEmail", () => {
  it("flags an empty / whitespace-only field as required", () => {
    expect(validateEmail("")).toEqual({ email: "", error: "required" });
    expect(validateEmail("   ")).toEqual({ email: "", error: "required" });
  });

  it("flags a malformed address as invalid", () => {
    expect(validateEmail("not-an-email").error).toBe("invalid");
    expect(validateEmail("missing@domain").error).toBe("invalid");
    expect(validateEmail("@example.com").error).toBe("invalid");
    expect(validateEmail("spaces in@example.com").error).toBe("invalid");
  });

  it("accepts a well-formed address and trims it", () => {
    expect(validateEmail("  owner@example.com  ")).toEqual({
      email: "owner@example.com",
      error: null,
    });
    expect(validateEmail("a.b+tag@sub.example.co.uk").error).toBeNull();
  });
});
