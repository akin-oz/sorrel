import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DIETARY_TAGS } from "./dietary";

/**
 * Sync guard (spec 011): the CMS dietary-tag codes must equal the schema's
 * DietaryTag enum, so Storyblok editorial joins to GraphQL funnel data by slug
 * without a translation table. Same firewall pattern as FUNNEL_STEPS ↔ schema.
 */
function schemaDietaryTags(): string[] {
  const sdl = readFileSync(join(__dirname, "..", "..", "..", "schema.graphql"), "utf8");
  const block = sdl.match(/enum\s+DietaryTag\s*\{([^}]*)\}/);
  if (!block) throw new Error("schema.graphql has no `enum DietaryTag { ... }` block");
  return block[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#") && !line.startsWith('"'));
}

describe("DietaryTag CMS ↔ schema sync", () => {
  it("matches the schema.graphql DietaryTag enum as a set", () => {
    expect(new Set(schemaDietaryTags())).toEqual(new Set(DIETARY_TAGS));
  });
});
