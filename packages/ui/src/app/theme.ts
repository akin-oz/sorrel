import { createTheme } from "@mui/material/styles";

import { FONT_MONO, FONT_SANS, FONT_SERIF, sorrelTheme } from "../theme/tokens";
import { appTokens } from "./tokens";

/**
 * The Sorrel MUI theme, derived from the design tokens (spec 010, relocated into
 * the App* layer by spec 018). One token source: the bespoke DeliveryDatePicker
 * and this MUI chrome read the same palette + type, so the funnel is one product.
 * Handed to ThemeProvider by AppThemeProvider.
 */
export const appTheme = createTheme({
  palette: {
    primary: { main: sorrelTheme.accent, contrastText: sorrelTheme.onAccent },
    background: { default: sorrelTheme.page, paper: sorrelTheme.paper },
    text: { primary: sorrelTheme.ink, secondary: sorrelTheme.inkMuted },
    divider: sorrelTheme.border,
    error: { main: appTokens.color.danger },
    success: { main: sorrelTheme.pillText },
  },
  shape: { borderRadius: sorrelTheme.radiusControl },
  typography: {
    fontFamily: FONT_SANS,
    h1: { fontFamily: FONT_SERIF, fontWeight: 600, letterSpacing: "-0.01em" },
    h2: { fontFamily: FONT_SERIF, fontWeight: 600, letterSpacing: "-0.01em" },
    h3: { fontFamily: FONT_SERIF, fontWeight: 600 },
    overline: { fontFamily: FONT_MONO, letterSpacing: "0.12em", fontWeight: 500 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: sorrelTheme.radiusCta,
          textTransform: "none",
          fontWeight: 600,
          minHeight: appTokens.control.minHeight,
        },
        sizeLarge: { minHeight: appTokens.control.minHeightLarge, fontSize: "1rem" },
      },
    },
  },
});
