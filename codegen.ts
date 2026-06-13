import type { CodegenConfig } from "@graphql-codegen/cli";

/**
 * Schema-first contract codegen (spec 007).
 *
 * `schema.graphql` is the single source of truth. Each consumer wires its own
 * output here from its spec — generated code lives WITH its consumer, not in a
 * shared package:
 *   - services/api -> typescript + typescript-resolvers   (spec 008)
 *   - apps/web     -> client preset / typed documents      (wizard spec)
 *
 * Until a consumer adds an entry, `generates` is empty and the contract is
 * guarded by `yarn codegen:check` (see scripts/codegen-check.mjs), which fails
 * the build on an invalid schema.
 */
const config: CodegenConfig = {
  schema: "./schema.graphql",
  generates: {
    "services/api/src/__generated__/resolvers.ts": {
      plugins: ["typescript", "typescript-resolvers"],
    },
    // apps/web — typed documents (client preset). Operations live in
    // apps/web/lib/graphql/**; the wizard imports the generated TypedDocumentNodes
    // and never hand-writes a network type. Enums emit as string unions so the
    // wizard's stored values (e.g. "EVERY_2_WEEKS") pass straight into variables.
    "apps/web/lib/gql/": {
      preset: "client",
      documents: ["apps/web/lib/graphql/**/*.ts"],
      presetConfig: { fragmentMasking: false },
      config: {
        enumsAsTypes: true,
        scalars: { Date: "string", DateTime: "string" },
        useTypeImports: true,
      },
    },
  },
};

export default config;
