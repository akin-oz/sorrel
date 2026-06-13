/**
 * App* layer design tokens (spec 018). The single home for the layout / sizing /
 * radius / control constants the adaptive components use — so no App* component
 * carries a magic number; it references a token here instead. Palette + type live
 * in the brand tokens (theme/tokens.ts); these are the structural values the MUI
 * layer needs on top.
 */
export const appTokens = {
  color: {
    /** Error/danger — not part of the delivery brand palette. */
    danger: "#9E2F23",
  },
  radius: {
    /** Bordered surfaces (cards, panels, rails), in px. */
    surface: 16,
  },
  layout: {
    /** Desktop page / funnel max width, in px. */
    pageMaxWidth: 1120,
    /** The funnel card / single-column mobile width, in px. */
    cardMaxWidth: 420,
    /** Desktop funnel grid: context rail (420) on the left, form column on the right.
     *  The panes are flush — divided by the rail's right border, with no gutter. */
    funnelColumns: "420px minmax(0, 1fr)",
  },
  control: {
    /** Minimum interactive target height, in px. */
    minHeight: 44,
    /** Large control (primary CTA) height, in px. */
    minHeightLarge: 52,
    /** Vertical padding inside a segmented toggle, in theme spacing units. */
    togglePaddingY: 1.25,
  },
} as const;
