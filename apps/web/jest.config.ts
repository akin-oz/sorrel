import type { Config } from "jest";

const config: Config = {
  // The current suite is the pure wizard reducer (no DOM). jsdom can come back
  // with the first component/interaction test (its own spec).
  testEnvironment: "node",
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
