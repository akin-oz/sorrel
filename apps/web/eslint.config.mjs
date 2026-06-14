import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated GraphQL typed documents (client preset) — owned by codegen.
    "lib/gql/**",
  ]),
  // Spec 018 — the App* layer is the seam: apps/web composes `@sorrel/ui` App*
  // components and never reaches for raw MUI or inline `sx`. Wrong is un-mergeable.
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='sx']",
          message:
            "No inline `sx` in apps/web — compose the App* components from @sorrel/ui (spec 018).",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@mui/*", "@emotion/*"],
              message:
                "No direct @mui/@emotion imports in apps/web — use the App* layer from @sorrel/ui (spec 018).",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
