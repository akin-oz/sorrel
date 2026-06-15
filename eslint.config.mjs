// @ts-check
import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import eslintConfigPrettier from "eslint-config-prettier";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/__generated__/**",
      "**/storybook-static/**",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  // Spec 033 — calendar / delivery-date domain logic lives in @sorrel/domain.
  // The UI never inlines blocked-weekday math, month-grid construction, or raw
  // setUTC* date arithmetic; it imports from @sorrel/domain. Tests in
  // packages/ui are exempt so they can exercise the public component API.
  {
    files: ["packages/ui/**/*.{ts,tsx}"],
    ignores: ["packages/ui/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
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
    },
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    extends: [eslintConfigPrettier],
  },
);
