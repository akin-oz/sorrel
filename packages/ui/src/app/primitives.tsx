"use client";

import { type ElementType, type ReactNode } from "react";

import Box from "@mui/material/Box";

import { type LayoutProps, type Responsive, layoutSx } from "./layout";

/**
 * Layout primitives (spec 018). They expose a curated, tokenized layout prop set
 * (`LayoutProps` — spacing on the theme scale, responsive objects) and apply it
 * via an internal `sx`, so apps/web composes layout with constrained props and
 * never freeform CSS. Visual styling (colour/border/radius) belongs to the
 * semantic components, not here.
 */

interface BaseProps extends LayoutProps {
  component?: ElementType;
  id?: string;
  role?: string;
  "aria-label"?: string;
  "aria-live"?: "polite" | "off" | "assertive";
  "aria-hidden"?: boolean;
  children?: ReactNode;
}

function box(props: BaseProps, base: Record<string, unknown>) {
  const { component = "div", id, role, children } = props;
  const aria = {
    "aria-label": props["aria-label"],
    "aria-live": props["aria-live"],
    "aria-hidden": props["aria-hidden"],
  };
  return (
    <Box component={component} id={id} role={role} sx={layoutSx(props, base)} {...aria}>
      {children}
    </Box>
  );
}

export interface AppStackProps extends BaseProps {
  /** Flex direction (defaults to column — the funnel's common case). */
  direction?: Responsive<"row" | "column">;
}
/** Flex container. */
export function AppStack({ direction = "column", ...props }: AppStackProps) {
  return box(props, { display: "flex", flexDirection: direction });
}

export type AppBoxProps = BaseProps;
/** Generic block with tokenized spacing/sizing. */
export function AppBox(props: AppBoxProps) {
  return box(props, {});
}

export interface AppContainerProps extends BaseProps {
  /** Centered max-width column; defaults to the design's 1120px page width. */
  width?: Responsive<number | string>;
}
/** Centered max-width column (page bands, wizard shell). */
export function AppContainer({ width = 1120, ...props }: AppContainerProps) {
  return box({ ...props, maxWidth: width }, { mx: "auto", width: "100%" });
}

export interface AppGridProps extends BaseProps {
  /** Responsive `grid-template-columns`, e.g. `{ xs: "1fr", md: "420px 1fr" }`. */
  columns?: Responsive<string>;
}
/** CSS grid. */
export function AppGrid({ columns, ...props }: AppGridProps) {
  return box(props, { display: "grid", gridTemplateColumns: columns });
}
