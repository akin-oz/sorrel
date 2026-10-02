import {
  TTS_MAX_CHARS,
  createRateLimiter,
  isTtsError,
  truncateForTts,
  validateTtsRequest,
} from "./tts";

describe("validateTtsRequest", () => {
  it("rejects a non-object body", () => {
    expect(validateTtsRequest(null)).toEqual({ ok: false, error: "invalid_json" });
    expect(validateTtsRequest("hello")).toEqual({ ok: false, error: "invalid_json" });
    expect(validateTtsRequest(["hello"])).toEqual({ ok: false, error: "invalid_json" });
  });

  it("requires text as a non-empty string", () => {
    expect(validateTtsRequest({})).toEqual({ ok: false, error: "text_required" });
    expect(validateTtsRequest({ text: 42 })).toEqual({ ok: false, error: "text_required" });
    expect(validateTtsRequest({ text: "" })).toEqual({ ok: false, error: "text_required" });
    expect(validateTtsRequest({ text: "   \n " })).toEqual({ ok: false, error: "text_required" });
  });

  it("accepts exactly the cap and rejects one over", () => {
    const atCap = "a".repeat(TTS_MAX_CHARS);
    expect(validateTtsRequest({ text: atCap })).toEqual({ ok: true, text: atCap });
    expect(validateTtsRequest({ text: `${atCap}a` })).toEqual({
      ok: false,
      error: "text_too_long",
    });
  });
});

describe("isTtsError", () => {
  it("narrows known server codes only", () => {
    expect(isTtsError("rate_limited")).toBe(true);
    expect(isTtsError("network")).toBe(false);
    expect(isTtsError(undefined)).toBe(false);
  });
});

describe("truncateForTts", () => {
  it("leaves short text untouched (trimmed)", () => {
    expect(truncateForTts("  Wild salmon.  ")).toBe("Wild salmon.");
  });

  it("cuts at the last word boundary within the cap", () => {
    expect(truncateForTts("one two three", 9)).toBe("one two");
    expect(truncateForTts("a".repeat(TTS_MAX_CHARS + 50)).length).toBe(TTS_MAX_CHARS);
  });
});

describe("createRateLimiter", () => {
  it("allows `limit` hits then blocks", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000, now: () => 0 });
    expect(limiter.check("ip")).toBe(true);
    expect(limiter.check("ip")).toBe(true);
    expect(limiter.check("ip")).toBe(false);
  });

  it("isolates keys", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 });
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("a")).toBe(false);
    expect(limiter.check("b")).toBe(true);
  });

  it("resets after the window elapses", () => {
    let t = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => t });
    expect(limiter.check("ip")).toBe(true);
    t = 999;
    expect(limiter.check("ip")).toBe(false);
    t = 1000;
    expect(limiter.check("ip")).toBe(true);
  });
});
