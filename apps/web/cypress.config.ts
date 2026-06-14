import { defineConfig } from "cypress";

/**
 * Spec 032 — Cypress bootstrap for the funnel happy path and the
 * delivery-picker real-browser catalog.
 *
 * Fixed-clock seed strategy: tests opt into `cy.clock(new Date(...))` rather
 * than depending on wall time, so the earliest-deliverable arithmetic in the
 * picker is deterministic regardless of when CI runs.
 *
 * TZ-env strategy: the config mirrors `process.env.TZ` into `Cypress.env`
 * so the C-24 TZ-matrix row can be invoked as
 *   TZ=America/Los_Angeles yarn cypress:run --spec ...correctness/tz.cy.ts
 *   TZ=Asia/Tokyo          yarn cypress:run --spec ...correctness/tz.cy.ts
 */
export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts",
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    screenshotOnRunFailure: false,
    setupNodeEvents(_on, config) {
      config.env = { ...config.env, TZ: process.env.TZ ?? "UTC" };
      return config;
    },
  },
});
