// Contract guard (spec 007): fail the build if schema.graphql is not a valid
// GraphQL schema. Runs before any consumer wires codegen output; once one does,
// extend this with `graphql-codegen --check` for generated-type drift.
import { buildSchema, validateSchema } from "graphql";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const sdl = readFileSync(join(here, "..", "schema.graphql"), "utf8");

// buildSchema throws on a parse error (uncaught → non-zero exit).
const schema = buildSchema(sdl);

const errors = validateSchema(schema);
if (errors.length > 0) {
  throw new Error(
    "schema.graphql is invalid:\n" + errors.map((error) => "  - " + error.message).join("\n"),
  );
}
