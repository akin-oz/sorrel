import { addons } from "@storybook/manager-api";
import { create } from "@storybook/theming/create";

/**
 * Spec 038 — toolbar branding. No external link-outs.
 */
addons.setConfig({
  theme: create({
    base: "light",
    brandTitle: "Sorrel UI",
    brandUrl: "",
    colorPrimary: "#A14D27",
    colorSecondary: "#A14D27",
  }),
});
