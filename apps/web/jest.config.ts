import type { Config } from "jest";

const config: Config = {
  // jsdom provides window/document/sessionStorage for hook unit tests.
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }],
  },
  testMatch: [
    "<rootDir>/app/**/*.test.ts",
    "<rootDir>/app/**/*.test.tsx",
    "<rootDir>/lib/**/*.test.ts",
    "<rootDir>/src/**/*.test.ts",
    "<rootDir>/src/**/*.test.tsx",
  ],
};

export default config;
