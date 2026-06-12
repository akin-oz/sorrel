import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }],
  },
  testMatch: ["<rootDir>/src/**/*.test.ts", "<rootDir>/src/**/tests/**/*.test.ts"],
};

export default config;
