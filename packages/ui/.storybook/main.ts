import type { StorybookConfig } from "@storybook/react-vite";

/**
 * Spec 038 — Storybook for the calendar centerpiece and the App* layer.
 * Vite renderer per Decision A.
 */
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-a11y", "@storybook/addon-themes"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  typescript: {
    check: false,
    reactDocgen: "react-docgen-typescript",
  },
  docs: {
    autodocs: false,
  },
};

export default config;
