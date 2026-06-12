import { readFileSync } from "node:fs";
import { join } from "node:path";

import { FUNNEL_STEPS, isFunnelStep } from "./funnel";

/**
 * Schema-sync guard: the GraphQL `FunnelStep` enum (network boundary) and the
 * app-side `FUNNEL_STEPS` tuple must never diverge. This reads the SDL directly
 * (no codegen, no graphql dependency) and asserts the enum members equal the
 * tuple — in order and as a set. Drift in either file fails the build.
 */
function readSchemaFunnelSteps(): string[] {
  const schemaPath = join(__dirname, "..", "..", "..", "schema.graphql");
  const sdl = readFileSync(schemaPath, "utf8");
  const block = sdl.match(/enum\s+FunnelStep\s*\{([^}]*)\}/);
  if (!block) {
    throw new Error("schema.graphql has no `enum FunnelStep { ... }` block");
  }
  return block[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#") && !line.startsWith('"'));
}

describe("FunnelStep schema sync", () => {
  it("matches the schema.graphql FunnelStep enum in order", () => {
    expect(readSchemaFunnelSteps()).toEqual([...FUNNEL_STEPS]);
  });

  it("matches the schema.graphql FunnelStep enum as a set", () => {
    expect(new Set(readSchemaFunnelSteps())).toEqual(new Set(FUNNEL_STEPS));
  });
});

describe("isFunnelStep", () => {
  it("accepts every canonical step", () => {
    for (const step of FUNNEL_STEPS) {
      expect(isFunnelStep(step)).toBe(true);
    }
  });

  it("rejects unknown segments", () => {
    expect(isFunnelStep("checkout")).toBe(false);
    expect(isFunnelStep("cats")).toBe(false); // case-sensitive: enum values are upper-case
  });
});
