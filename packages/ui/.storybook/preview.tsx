import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import type { Preview } from "@storybook/react";

import { useInjectDeliveryStyles } from "../src/theme/styles";
import { brambleTheme, sorrelTheme } from "../src/theme/tokens";

/**
 * Spec 038 — global preview decorators:
 *  - `@storybook/addon-themes` toolbar flips between Sorrel and Bramble.
 *  - Decorator resolves the active theme to `DeliveryTheme` + a matching MUI
 *    `ThemeProvider` seed so App* primitives + the picker share one source.
 *  - Picker styles inject once (matches `useInjectDeliveryStyles`).
 *  - axe-addon config mirrors `apps/web/cypress/e2e/delivery-picker/a11y.cy.ts`:
 *    only `region` + `page-has-heading-one` disabled.
 */

const THEMES = { Sorrel: sorrelTheme, Bramble: brambleTheme } as const;
type ThemeName = keyof typeof THEMES;

function setSdpVars(themeName: ThemeName) {
  const theme = THEMES[themeName];
  const root = document.documentElement;
  root.style.setProperty("--sdp-accent", theme.accent);
  root.style.setProperty("--sdp-surface", theme.surface);
  document.body.style.backgroundColor = theme.page;
  document.body.style.color = theme.ink;
}

const muiTheme = createTheme({
  palette: {
    primary: { main: sorrelTheme.accent },
    background: { default: sorrelTheme.page, paper: sorrelTheme.paper },
    text: { primary: sorrelTheme.ink, secondary: sorrelTheme.inkMuted },
    divider: sorrelTheme.border,
  },
});

const preview: Preview = {
  parameters: {
    layout: "centered",
    controls: { expanded: true },
    a11y: {
      config: {
        rules: [
          { id: "region", enabled: false },
          { id: "page-has-heading-one", enabled: false },
        ],
      },
      options: {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "best-practice"] },
      },
    },
  },
  decorators: [
    (Story, context) => {
      const themeName = (context.globals.brand ?? "Sorrel") as ThemeName;
      setSdpVars(themeName);
      useInjectDeliveryStyles();
      return (
        <ThemeProvider theme={muiTheme}>
          <CssBaseline />
          <Story />
        </ThemeProvider>
      );
    },
  ],
  globalTypes: {
    brand: {
      name: "Brand",
      description: "Sorrel vs Bramble token skin",
      defaultValue: "Sorrel",
      toolbar: {
        icon: "paintbrush",
        items: [
          { value: "Sorrel", title: "Sorrel" },
          { value: "Bramble", title: "Bramble" },
        ],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
