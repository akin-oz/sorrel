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

  it("rejects an address longer than RFC 5321's 254 chars (spec 041 §7)", () => {
    // 255-char address: "x".repeat(243) + "@example.com" (243 + 12 = 255)
    const tooLong = `${"x".repeat(243)}@example.com`;
    expect(tooLong.length).toBe(255);
    expect(validateEmail(tooLong)).toEqual({ email: "", error: "invalid" });
  });

  it("rejects a double-@ address (spec 044 §7)", () => {
    expect(validateEmail("test@@example.com").error).toBe("invalid");
  });

  it("rejects a bare-TLD address with no dot in the domain (spec 044 §7)", () => {
    expect(validateEmail("owner@com").error).toBe("invalid");
  });
});
