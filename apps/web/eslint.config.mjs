import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Pin the React version so eslint-plugin-react (a dep of eslint-config-next) never
  // calls context.getFilename() for auto-detection — that API was removed in ESLint 10.
  // Without this override the `version: 'detect'` setting from eslint-config-next
  // triggers a crash on every file. Spec 042.
  {
    settings: {
      react: { version: "19.0.0" },
    },
  },
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
              group: ["@mui", "@mui/*", "@emotion", "@emotion/*"],
              message:
                "No direct @mui/@emotion imports in apps/web — use the App* layer from @sorrel/ui (spec 018).",
            },
          ],
        },
      ],
    },
  },
  // Spec 032 — Cypress files extend the global `Cypress.Chainable` interface
  // via `declare global { namespace Cypress { ... } }`, which is the pattern
  // Cypress itself documents. Allow the namespace declaration here only, so
  // the override files do not need per-line eslint-disable comments.
  {
    files: ["cypress/**/*.ts"],
    rules: {
      "@typescript-eslint/no-namespace": ["error", { allowDeclarations: true }],
    },
  },
]);

export default eslintConfig;
