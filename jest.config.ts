import type { Config } from "jest";

const config: Config = {
  projects: [
    "<rootDir>/packages/domain/jest.config.ts",
    "<rootDir>/packages/shared/jest.config.ts",
    "<rootDir>/packages/analytics/jest.config.ts",
    "<rootDir>/packages/ui/jest.config.ts",
    "<rootDir>/services/api/jest.config.ts",
    "<rootDir>/apps/web/jest.config.ts",
  ],
};

export default config;
