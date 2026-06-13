"use client";

import { type ReactNode } from "react";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";

import { appTheme } from "./theme";

/**
 * The single MUI setup boundary (spec 018). Wraps the App Router emotion cache,
 * the Sorrel theme, and CssBaseline so apps/web never imports `@mui` directly —
 * even for setup. Mount once near the root of MUI-using routes.
 */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={appTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
