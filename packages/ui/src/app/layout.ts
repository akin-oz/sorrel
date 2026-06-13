import type { SxProps, Theme } from "@mui/material/styles";

/** A value or a responsive breakpoint object — the tokenized prop shape. */
export type Responsive<T> = T | Partial<Record<"xs" | "sm" | "md" | "lg" | "xl", T>>;

/**
 * The layout prop vocabulary the primitives expose (spec 018). Names mirror MUI's
 * system props but are a curated, tokenized subset — spacing on the theme scale,
 * no freeform CSS. Applied via the primitives' internal `sx` (the ban is on
 * apps/web call sites, not here).
 */
export interface LayoutProps {
  p?: Responsive<number>;
  px?: Responsive<number>;
  py?: Responsive<number>;
  pt?: Responsive<number>;
  pb?: Responsive<number>;
  m?: Responsive<number>;
  mt?: Responsive<number>;
  mb?: Responsive<number>;
  mx?: Responsive<number>;
  gap?: Responsive<number>;
  width?: Responsive<number | string>;
  maxWidth?: Responsive<number | string>;
  minHeight?: Responsive<number | string>;
  flex?: Responsive<number | string>;
  alignItems?: Responsive<string>;
  justifyContent?: Responsive<string>;
  alignSelf?: Responsive<string>;
  textAlign?: Responsive<string>;
}

const LAYOUT_KEYS: readonly (keyof LayoutProps)[] = [
  "p",
  "px",
  "py",
  "pt",
  "pb",
  "m",
  "mt",
  "mb",
  "mx",
  "gap",
  "width",
  "maxWidth",
  "minHeight",
  "flex",
  "alignItems",
  "justifyContent",
  "alignSelf",
  "textAlign",
];

/** Project the layout props that are set onto an `sx` object. */
export function layoutSx(props: LayoutProps, base: Record<string, unknown> = {}): SxProps<Theme> {
  const sx: Record<string, unknown> = { ...base };
  for (const key of LAYOUT_KEYS) {
    const value = props[key];
    if (value !== undefined) sx[key] = value;
  }
  return sx;
}
