/**
 * Delivery-picker brand tokens (spec 001).
 *
 * One component, two skins — only these tokens change between brands. Values are
 * lifted directly from the design handoff's token-swap table and screens.
 */

export interface DeliveryTheme {
  name: string;
  /** Page tint behind the card. */
  page: string;
  /** Card surface. */
  paper: string;
  /** Pure surface (inputs, modal, day cells). */
  surface: string;
  ink: string;
  inkMuted: string;
  /** Monospace label colour. */
  mono: string;
  accent: string;
  onAccent: string;
  /** Spec 036: high-contrast ink for text on the accent background (selected
   *  day cell, Confirm button). Distinct from `onAccent`, which axe-core 4.10
   *  flagged as failing WCAG AA 4.5:1 on terracotta in real-browser rendering
   *  despite the math passing — `accentInk` is the safety-net value. */
  accentInk: string;
  accentTint: string;
  border: string;
  /** Border on an available day cell. */
  cellBorder: string;
  /** Text colour for blocked / out-of-range days. */
  dayMuted: string;
  pillBg: string;
  pillText: string;
  /** Modal backdrop scrim + shadow colour (ink-based, per brand). */
  scrim: string;
  /** Day-cell + input corner radius (px). */
  radiusControl: number;
  /** CTA corner radius (px) — pill (999) for Sorrel, soft for Bramble. */
  radiusCta: number;
  /** Free-delivery pill radius (px). */
  radiusPill: number;
}

// The host app loads the faces (e.g. via next/font) and exposes them as these
// CSS variables; the literal names + generic families are the standalone
// fallback (Storybook, tests, or any consumer that doesn't set the variables).
export const FONT_SERIF = "var(--font-serif, 'Source Serif 4'), Georgia, serif";
export const FONT_SANS = "var(--font-sans, 'Public Sans'), system-ui, sans-serif";
export const FONT_MONO = "var(--font-mono, 'IBM Plex Mono'), ui-monospace, monospace";

export const sorrelTheme: DeliveryTheme = {
  name: "Sorrel",
  page: "#E8E1D3",
  paper: "#FBF7F1",
  surface: "#FFFFFF",
  ink: "#2E2520",
  inkMuted: "#6E6055",
  mono: "#A8967F",
  accent: "#A14D27",
  onAccent: "#FFF8F2",
  accentInk: "#FFFFFF",
  accentTint: "#F4E3D8",
  border: "#E3D8C8",
  cellBorder: "#EAE0D2",
  dayMuted: "#C9BCA9",
  pillBg: "#E7EDE2",
  pillText: "#3F5238",
  scrim: "rgba(46,37,32,0.5)",
  radiusControl: 12,
  radiusCta: 999,
  radiusPill: 999,
};

export const brambleTheme: DeliveryTheme = {
  name: "Bramble",
  page: "#F3F3EA",
  paper: "#F3F3EA",
  surface: "#FFFFFF",
  ink: "#252B23",
  inkMuted: "#5A6354",
  mono: "#9AA08D",
  accent: "#3E6B45",
  onAccent: "#F2F7F0",
  accentInk: "#FFFFFF",
  accentTint: "#E3EBDC",
  border: "#DDE1D2",
  cellBorder: "#DDE1D2",
  dayMuted: "#B3B8A6",
  pillBg: "#E3EBDC",
  pillText: "#33502F",
  scrim: "rgba(37,43,35,0.5)",
  radiusControl: 8,
  radiusCta: 10,
  radiusPill: 6,
};

export const deliveryThemes = { sorrel: sorrelTheme, bramble: brambleTheme } as const;
export type DeliveryThemeName = keyof typeof deliveryThemes;
