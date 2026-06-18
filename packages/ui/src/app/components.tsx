"use client";

import { type ElementType, type ReactNode, useId } from "react";

import Alert, { type AlertProps } from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button, { type ButtonProps } from "@mui/material/Button";
import Chip, { type ChipProps } from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton, { type IconButtonProps } from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Skeleton, { type SkeletonProps } from "@mui/material/Skeleton";
import TextField, { type TextFieldProps } from "@mui/material/TextField";
import ToggleButton, { type ToggleButtonProps } from "@mui/material/ToggleButton";
import ToggleButtonGroup, { type ToggleButtonGroupProps } from "@mui/material/ToggleButtonGroup";
import Typography, { type TypographyProps } from "@mui/material/Typography";

import { FONT_SERIF, sorrelTheme } from "../theme/tokens";
import { type LayoutProps, type Responsive, layoutSx } from "./layout";
import { appTokens } from "./tokens";

/**
 * Semantic App* components (spec 018). Styling is baked in here (these may use
 * MUI `sx` internally — the ban is only on apps/web call sites); apps/web passes
 * intent props, never CSS. A curated set of type props (fontSize/lineHeight/…)
 * is exposed where the design genuinely varies, kept off the freeform `sx` system.
 */

/** Resolve a responsive value (or scalar) by mapping each breakpoint through `fn`. */
function mapResponsive<T, R>(value: Responsive<T>, fn: (v: T) => R): Responsive<R> {
  if (value !== null && typeof value === "object") {
    const out: Record<string, R> = {};
    for (const [k, v] of Object.entries(value as Record<string, T>)) out[k] = fn(v);
    return out as Responsive<R>;
  }
  return fn(value as T);
}

// ─── Type ──────────────────────────────────────────────────────────────────

interface TypeTuning {
  /** Override font size — number (px) or responsive object. Tokenised, not freeform CSS. */
  fontSize?: Responsive<number | string>;
  lineHeight?: Responsive<number | string>;
  /** A palette path ("text.secondary") or a token hex from the design. */
  color?: string;
  align?: TypographyProps["align"];
  maxWidth?: number | string;
  /** Underline control — `none` for wordmark/nav links. */
  textDecoration?: "none" | "underline";
  /** `text-wrap` for headings/quotes (`pretty` avoids orphans). */
  textWrap?: "pretty" | "balance";
}

type AppHeadingProps = TypeTuning & {
  level: 1 | 2 | 3;
  fontWeight?: number;
  component?: TypographyProps["component"];
  href?: string;
  children: ReactNode;
};

/** Serif heading (h1–h3 from the theme), with optional per-instance size. */
export function AppHeading({
  level,
  fontSize,
  fontWeight,
  lineHeight,
  color,
  align,
  maxWidth,
  textDecoration,
  textWrap,
  ...rest
}: AppHeadingProps) {
  return (
    <Typography
      variant={`h${level}`}
      align={align}
      sx={{ fontSize, fontWeight, lineHeight, color, maxWidth, textDecoration, textWrap }}
      {...rest}
    />
  );
}

type AppTextProps = TypeTuning & {
  variant?: "body1" | "body2" | "overline" | "caption";
  fontWeight?: number;
  component?: TypographyProps["component"];
  href?: string;
  id?: string;
  "aria-live"?: "polite" | "off" | "assertive";
  /** `storyblokEditable()` spread for the Visual Editor (CMS copy). */
  editable?: Record<string, unknown>;
  children: ReactNode;
};

/** Body / overline / caption text. */
export function AppText({
  variant = "body1",
  fontSize,
  fontWeight,
  lineHeight,
  color,
  align,
  maxWidth,
  textDecoration,
  textWrap,
  editable,
  ...rest
}: AppTextProps) {
  return (
    <Typography
      variant={variant}
      align={align}
      sx={{ fontSize, fontWeight, lineHeight, color, maxWidth, textDecoration, textWrap }}
      {...rest}
      {...editable}
    />
  );
}

// ─── Actions / inputs (thin, theme-styled) ───────────────────────────────────

export type AppButtonProps = Omit<ButtonProps, "sx"> & {
  /** Inverted palette for a CTA sitting on the accent band (white fill, accent text). */
  inverted?: boolean;
};
/** CTA / text button — styling from the theme's MuiButton overrides. */
export function AppButton({ inverted, ref, ...props }: AppButtonProps) {
  const sx = inverted
    ? {
        bgcolor: sorrelTheme.onAccent,
        color: "primary.main",
        "&:hover": { bgcolor: sorrelTheme.accentTint },
      }
    : undefined;
  return <Button ref={ref} sx={sx} {...props} />;
}

export interface AppLinkProps extends LayoutProps {
  href: string;
  /** Routing Link component (next-intl); defaults to a plain anchor. */
  component?: ElementType;
  /** Colour (palette path or token); inherits by default. */
  color?: string;
  /** Underline: `false`/omitted = none (wordmarks, nav); `true` = always;
   *  `"hover"` = underline on hover only (footer links), offset 3px. */
  underline?: boolean | "hover";
  "aria-label"?: string;
  "aria-current"?: "true" | "page";
  /** `storyblokEditable()` spread for the Visual Editor (CMS links). */
  editable?: Record<string, unknown>;
  children: ReactNode;
}
/** Styled link (wordmark, nav, footer) — colour + no underline, composes layout props. */
export function AppLink({
  href,
  component,
  color,
  underline,
  editable,
  children,
  ...rest
}: AppLinkProps) {
  const { "aria-label": ariaLabel, "aria-current": ariaCurrent, ...layout } = rest;
  return (
    <Box
      component={component ?? "a"}
      href={href}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      sx={layoutSx(
        layout,
        underline === "hover"
          ? {
              color: color ?? "inherit",
              textDecoration: "none",
              "&:hover": { textDecoration: "underline", textUnderlineOffset: "3px" },
            }
          : {
              color: color ?? "inherit",
              textDecoration: underline ? "underline" : "none",
            },
      )}
      {...editable}
    >
      {children}
    </Box>
  );
}

export type AppIconButtonProps = Omit<IconButtonProps, "sx">;
/** Icon-only button (e.g. the wizard back arrow) — 44px target, inherits ink. */
export function AppIconButton({ ref, ...props }: AppIconButtonProps) {
  return <IconButton ref={ref} sx={{ width: 44, height: 44, color: "text.primary" }} {...props} />;
}

export type AppChipProps = Omit<ChipProps, "sx">;
export function AppChip(props: AppChipProps) {
  return <Chip sx={{ fontWeight: 600 }} {...props} />;
}

export type AppSkeletonProps = Omit<SkeletonProps, "sx">;
export function AppSkeleton(props: AppSkeletonProps) {
  return <Skeleton {...props} />;
}

export type AppAlertProps = Omit<AlertProps, "sx">;
/** Inline status banner (e.g. EMAIL "saved"). */
export function AppAlert(props: AppAlertProps) {
  return <Alert {...props} />;
}

export type AppFieldProps = Omit<TextFieldProps, "sx"> & {
  /** Select options — pass with `select` instead of raw MenuItem children. */
  options?: { value: string; label: string }[];
};
/** Text or select field (PROFILE/EMAIL). Pass `select` + `options` for a dropdown. */
export function AppField({ options, children, ref, ...props }: AppFieldProps) {
  return (
    <TextField
      ref={ref}
      {...props}
      slotProps={
        props.error
          ? { formHelperText: { role: "alert", "aria-live": "polite" as const } }
          : undefined
      }
    >
      {options
        ? options.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))
        : children}
    </TextField>
  );
}

export type AppToggleGroupProps = Omit<ToggleButtonGroupProps, "sx" | "color"> & {
  /** `segmented` = equal-width connected bar (frequency); `cards` = a grid of
   *  standalone selectable cards (cat count); `pills` = wrapping rounded pills
   *  sized to their content (PROFILE age/weight). */
  layout?: "segmented" | "cards" | "pills";
  /** For `cards`: responsive `grid-template-columns`. */
  columns?: Responsive<string>;
};
/** Single-select control — segmented bar, card grid, or wrapping pills. */
export function AppToggleGroup({ layout = "segmented", columns, ...props }: AppToggleGroupProps) {
  const cardsSx = {
    display: "grid",
    gridTemplateColumns: columns ?? "repeat(2, 1fr)",
    gap: { xs: "12px", md: "14px" },
    // Reset the connected-group treatment so each option is a standalone card.
    "& .MuiToggleButtonGroup-grouped": {
      m: 0,
      minWidth: 0,
      flexDirection: "column",
      gap: "2px",
      textTransform: "none",
      height: { xs: 96, md: 104 },
      borderRadius: `${appTokens.radius.surface}px`,
      border: "1.5px solid",
      borderColor: "divider",
      bgcolor: "background.paper",
      "&.Mui-selected": {
        bgcolor: sorrelTheme.accentTint,
        borderWidth: 2,
        borderColor: "primary.main",
        "&:hover": { bgcolor: sorrelTheme.accentTint },
      },
    },
  };
  // Standalone rounded pills that wrap and size to content — each its own bordered
  // control (the connected-group treatment is reset, like `cards`).
  const pillsSx = {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    "& .MuiToggleButtonGroup-grouped": {
      m: 0,
      minWidth: 0,
      textTransform: "none",
      px: 2,
      py: 1,
      fontWeight: 600,
      color: "text.primary",
      borderRadius: "999px",
      border: "1.5px solid",
      borderColor: "divider",
      bgcolor: "background.paper",
      "&.Mui-selected": {
        bgcolor: sorrelTheme.accentTint,
        borderWidth: 2,
        borderColor: "primary.main",
        color: "primary.main",
        "&:hover": { bgcolor: sorrelTheme.accentTint },
      },
    },
  };
  const segmentedSx = {
    alignSelf: "stretch",
    "& .MuiToggleButton-root": { flex: 1, py: appTokens.control.togglePaddingY },
  };
  const sx = layout === "cards" ? cardsSx : layout === "pills" ? pillsSx : segmentedSx;
  return <ToggleButtonGroup exclusive color="primary" sx={sx} {...props} />;
}

export type AppToggleOptionProps = Omit<ToggleButtonProps, "sx">;
export function AppToggleOption(props: AppToggleOptionProps) {
  return <ToggleButton {...props} />;
}

// ─── Surface ──────────────────────────────────────────────────────────────

const TONE_BG = {
  paper: "background.paper",
  page: sorrelTheme.page,
  surface: sorrelTheme.surface,
  accentTint: sorrelTheme.accentTint,
  accent: "primary.main",
  ink: "text.primary",
  transparent: "transparent",
} as const;

interface AppCardProps extends LayoutProps {
  /** Background tone (default `paper`). */
  tone?: keyof typeof TONE_BG;
  /** Corner radius — number (theme units) or px/responsive string. Defaults to the surface token. */
  radius?: Responsive<number | string>;
  /** Lifted card shadow (responsive). */
  shadow?: Responsive<boolean>;
  /** Full 1px border on all sides (default true; responsive — e.g. `{ xs: false, sm: true }`
   *  for a card that's full-bleed on mobile but outlined when floating). */
  border?: Responsive<boolean>;
  /** 1px border on the right only (the rail divider). */
  borderRight?: boolean;
  /** 1px border on the top (responsive — list-row rules). */
  borderTop?: Responsive<boolean>;
  /** 1px border on the bottom (responsive — the desktop top-bar divider). */
  borderBottom?: Responsive<boolean>;
  overflow?: "hidden" | "visible";
  /** When set, the card becomes a flex container in this direction. */
  direction?: Responsive<"row" | "column">;
  /** Insert a 1px divider between direct children (list rows). */
  divider?: boolean;
  /** Convenience padding (theme units) — default 2.5; `px`/`py`/… override per axis. */
  padding?: Responsive<number | string>;
  component?: ElementType;
  id?: string;
  role?: string;
  "aria-live"?: "polite" | "off" | "assertive";
  /** `storyblokEditable()` spread for the Visual Editor (CMS cards). */
  editable?: Record<string, unknown>;
  children: ReactNode;
}

/** Bordered/tonal surface — recipe cards, the plan/summary panels, the funnel shell,
 *  the rail and form panes. Layout props (`gap`, `px`, `minHeight`, …) apply too. */
export function AppCard({
  tone = "paper",
  radius,
  shadow,
  border = true,
  borderRight,
  borderTop,
  borderBottom,
  overflow,
  direction,
  divider,
  padding = 2.5,
  component = "div",
  id,
  role,
  editable,
  children,
  ...layout
}: AppCardProps) {
  const base: Record<string, unknown> = {
    p: padding,
    bgcolor: TONE_BG[tone],
    borderRadius: radius ?? `${appTokens.radius.surface}px`,
  };
  // Borders set width/style/colour separately — never the `border` shorthand, which
  // (in a responsive media query) resets border-colour back to currentColor.
  if (border !== false) {
    base.borderStyle = "solid";
    base.borderColor = "divider";
    base.borderWidth =
      border === true || border === undefined
        ? "1px"
        : mapResponsive(border, (b) => (b ? "1px" : "0px"));
  }
  if (borderRight) {
    base.borderRightStyle = "solid";
    base.borderRightColor = "divider";
    base.borderRightWidth = "1px";
  }
  if (borderTop !== undefined) {
    base.borderTopStyle = "solid";
    base.borderTopColor = "divider";
    base.borderTopWidth = mapResponsive(borderTop, (b) => (b ? "1px" : "0px"));
  }
  if (borderBottom !== undefined) {
    base.borderBottomStyle = "solid";
    base.borderBottomColor = "divider";
    base.borderBottomWidth = mapResponsive(borderBottom, (b) => (b ? "1px" : "0px"));
  }
  if (shadow !== undefined) {
    base.boxShadow = mapResponsive(shadow, (b) => (b ? appTokens.shadow.card : "none"));
  }
  if (overflow) base.overflow = overflow;
  if (direction) {
    base.display = "flex";
    base.flexDirection = direction;
  }
  if (divider) {
    base["& > :not(:first-of-type)"] = { borderTop: "1px solid", borderColor: "divider" };
  }
  const ariaLive = (layout as { "aria-live"?: AppCardProps["aria-live"] })["aria-live"];
  return (
    <Box
      component={component}
      id={id}
      role={role}
      aria-live={ariaLive}
      sx={layoutSx(layout, base)}
      {...editable}
    >
      {children}
    </Box>
  );
}

// ─── Band / Image ────────────────────────────────────────────────────────────

export interface AppBandProps {
  /** Band background tone (default none → transparent). */
  tone?: keyof typeof TONE_BG;
  /** Inner column max width in px (design: 1120 default, 720 for FAQ/CTA). */
  maxWidth?: number;
  /** Semantic element — section (default), header, footer. */
  component?: ElementType;
  /** Hairline divider on the band's bottom edge (the nav). */
  borderBottom?: boolean;
  id?: string;
  /** `storyblokEditable()` spread for the Visual Editor. */
  editable?: Record<string, unknown>;
  children: ReactNode;
}

/** Full-bleed tonal section + a centered max-width column. Compose the inner
 *  layout with AppStack/AppGrid as the child (spec 012/018). */
export function AppBand({
  tone,
  maxWidth = appTokens.layout.pageMaxWidth,
  component = "section",
  borderBottom,
  id,
  editable,
  children,
}: AppBandProps) {
  const outer: Record<string, unknown> = { width: "100%", px: { xs: 2.5, md: 5 } };
  if (tone) outer.bgcolor = TONE_BG[tone];
  if (borderBottom) {
    outer.borderBottomStyle = "solid";
    outer.borderBottomColor = "divider";
    outer.borderBottomWidth = "1px";
  }
  return (
    <Box component={component} id={id} {...editable} sx={outer}>
      <Box sx={{ width: "100%", maxWidth: `${maxWidth}px`, mx: "auto" }}>{children}</Box>
    </Box>
  );
}

interface AppImageBaseProps {
  src?: string;
  alt: string;
  height?: Responsive<number | string>;
  radius?: Responsive<number | string>;
  /** Decorative CSS background shown when `src` is absent (placeholder art). */
  fallbackBackground?: string;
}

/**
 * `AppImageProps` is a discriminated union:
 *
 * - Without `imageComponent`: plain `<img>` fallback (Storybook, any non-Next host).
 * - With `imageComponent`: `intrinsicWidth` + `intrinsicHeight` are required so the
 *   browser can reserve layout space before the asset loads (CLS prevention). The
 *   component is injected by the host (e.g. `next/image`) — `packages/ui` stays
 *   framework-agnostic and never imports `next`.
 */
export type AppImageProps =
  | (AppImageBaseProps & {
      imageComponent?: undefined;
      intrinsicWidth?: undefined;
      intrinsicHeight?: undefined;
    })
  | (AppImageBaseProps & {
      /** Render-prop replacing the native `<img>`. Structurally satisfied by
       *  `next/image`'s default export for the props we pass — the minimal
       *  type is intentional: wider types (ImgHTMLAttributes.src?: string|Blob)
       *  make next/image's required `src: string|StaticImport` incompatible. */
      imageComponent: (props: {
        src: string;
        alt: string;
        width: number;
        height: number;
      }) => React.ReactNode;
      /** Asset's natural pixel width — required when `imageComponent` is provided. */
      intrinsicWidth: number;
      /** Asset's natural pixel height — required when `imageComponent` is provided. */
      intrinsicHeight: number;
    });

/** Cover image with tokenized height/radius; renders a decorative placeholder
 *  band when `src` is unset (spec 012's striped stand-in).
 *
 *  Pass `imageComponent` (e.g. `next/image`) + `intrinsicWidth`/`intrinsicHeight`
 *  to enable AVIF/WebP transcoding, lazy loading, and CLS-safe layout reservation
 *  without importing a framework-specific package into `packages/ui`. */
export function AppImage({ src, alt, height, radius, fallbackBackground, ...rest }: AppImageProps) {
  if (!src) {
    return (
      <Box
        aria-hidden
        sx={{ width: "100%", height, borderRadius: radius, background: fallbackBackground }}
      />
    );
  }

  if ("imageComponent" in rest && rest.imageComponent !== undefined) {
    const { imageComponent: ImageComponent, intrinsicWidth, intrinsicHeight } = rest;
    return (
      <Box
        sx={{
          width: "100%",
          height,
          borderRadius: radius,
          overflow: "hidden",
          display: "block",
          "& img": { width: "100%", height: "100%", objectFit: "cover", display: "block" },
        }}
      >
        {ImageComponent({ src, alt, width: intrinsicWidth, height: intrinsicHeight })}
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      sx={{ width: "100%", height, objectFit: "cover", borderRadius: radius, display: "block" }}
    />
  );
}

// ─── Progress ────────────────────────────────────────────────────────────────

interface AppProgressBarProps {
  /** Completed/active steps (1-based). */
  value: number;
  /** Total steps. */
  max: number;
  /** Accessible label (omit + set `decorative` for a purely visual duplicate). */
  label?: string;
  decorative?: boolean;
  width?: Responsive<number | string>;
}

/** The wizard's segmented step bar. */
export function AppProgressBar({ value, max, label, decorative, width }: AppProgressBarProps) {
  return (
    <Box
      role={decorative ? undefined : "progressbar"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
      aria-valuemin={decorative ? undefined : 1}
      aria-valuemax={decorative ? undefined : max}
      aria-valuenow={decorative ? undefined : value}
      sx={{ display: "flex", gap: "5px", width: width ?? "100%" }}
    >
      {Array.from({ length: max }, (_, i) => (
        <Box
          key={i}
          sx={{
            flex: 1,
            height: 4,
            borderRadius: "2px",
            bgcolor: i < value ? "primary.main" : sorrelTheme.border,
          }}
        />
      ))}
    </Box>
  );
}

interface AppMeterProps {
  /** Fill fraction (0..1). */
  value: number;
  /** Fill colour — palette path ("primary.main") or token hex. */
  color: string;
  /** Bar height in px. */
  height?: number;
  /** Track (unfilled) colour. */
  trackColor?: string;
  /** Accessible label for the meter. */
  label?: string;
}
/** Horizontal proportion bar — a funnel step's fill against its track. */
export function AppMeter({
  value,
  color,
  height = 22,
  trackColor = sorrelTheme.accentTint,
  label,
}: AppMeterProps) {
  const pct = `${Math.max(0, Math.min(1, value)) * 100}%`;
  return (
    <Box
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.max(0, Math.min(1, value)) * 100)}
      aria-label={label}
      sx={{ flex: 1, height, borderRadius: "11px", bgcolor: trackColor, overflow: "hidden" }}
    >
      <Box sx={{ width: pct, height: "100%", bgcolor: color }} />
    </Box>
  );
}

// ─── Dialog ──────────────────────────────────────────────────────────────────

interface AppDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  body?: string;
  /** Footer actions (buttons), stacked. */
  actions?: ReactNode;
}

export function AppDialog({ open, onClose, title, body, actions }: AppDialogProps) {
  const titleId = useId();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby={titleId}
      slotProps={{
        paper: {
          sx: {
            borderRadius: `${appTokens.radius.surface}px`,
            p: 1,
            maxWidth: "26rem",
            bgcolor: "background.paper",
          },
        },
      }}
    >
      <DialogTitle
        id={titleId}
        sx={{ fontFamily: FONT_SERIF, fontWeight: 700, fontSize: "1.5rem" }}
      >
        {title}
      </DialogTitle>
      {body ? (
        <DialogContent>
          <DialogContentText sx={{ color: "text.secondary" }}>{body}</DialogContentText>
        </DialogContent>
      ) : null}
      {actions ? (
        <DialogActions
          sx={{
            flexDirection: "column",
            gap: 1,
            px: 3,
            pb: 3,
            "& > :not(:first-of-type)": { ml: 0 },
          }}
        >
          {actions}
        </DialogActions>
      ) : null}
    </Dialog>
  );
}
