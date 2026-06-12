import { type CSSProperties } from "react";

import { SORREL_MARK_PATH, SORREL_MARK_TRANSFORM, SORREL_MARK_VIEWBOX } from "./assets/sorrelMark";

export interface BrandLogoProps {
  /** Square size in px. Default 32. */
  size?: number;
  /** Mark colour. Defaults to `currentColor` so it tints to the surrounding text colour. */
  color?: string;
  /** Accessible name. Omit for a decorative mark (rendered `aria-hidden`). */
  title?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * The Sorrel brand mark, inlined so `currentColor` works — pass a brand accent
 * (Sorrel terracotta / Bramble green) and the same mark serves both skins.
 */
export function BrandLogo({
  size = 32,
  color = "currentColor",
  title,
  className,
  style,
}: BrandLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={SORREL_MARK_VIEWBOX}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
      style={style}
    >
      {title ? <title>{title}</title> : null}
      <g transform={SORREL_MARK_TRANSFORM} fill={color} stroke="none">
        <path d={SORREL_MARK_PATH} />
      </g>
    </svg>
  );
}
