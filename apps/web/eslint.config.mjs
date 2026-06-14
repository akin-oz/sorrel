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
  //
  // Spec 033 — calendar / delivery-date domain logic lives in @sorrel/domain.
  // apps/web never inlines blocked-weekday math, month-grid construction, or
  // raw setUTC* date arithmetic; it imports from @sorrel/domain. Tests are
  // exempt so they can exercise the public funnel API.
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='sx']",
          message:
            "No inline `sx` in apps/web — compose the App* components from @sorrel/ui (spec 018).",
        },
        ...[
          "BLOCKED_WEEKDAY_INDEXES",
          "blockedInfo",
          "earliestDeliverableDate",
          "buildMonthView",
          "mondayIndex",
          "isDeliverableWeekday",
          "moveFocus",
        ].flatMap((name) => [
          {
            selector: `VariableDeclarator[id.name='${name}']`,
            message:
              "Calendar / delivery-date logic lives in @sorrel/domain. Import it; do not inline.",
          },
          {
            selector: `FunctionDeclaration[id.name='${name}']`,
            message:
              "Calendar / delivery-date logic lives in @sorrel/domain. Import it; do not inline.",
          },
        ]),
        {
          selector: "MemberExpression[property.name='setUTCDate']",
          message:
            "Calendar / delivery-date logic lives in @sorrel/domain. Import it; do not inline.",
        },
        {
          selector: "MemberExpression[property.name='setUTCMonth']",
          message:
            "Calendar / delivery-date logic lives in @sorrel/domain. Import it; do not inline.",
        },
        {
          selector: "MemberExpression[property.name='setUTCFullYear']",
          message:
            "Calendar / delivery-date logic lives in @sorrel/domain. Import it; do not inline.",
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
