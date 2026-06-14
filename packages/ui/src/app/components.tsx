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
  lineHeight?: number | string;
  /** A palette path ("text.secondary") or a token hex from the design. */
  color?: string;
  align?: TypographyProps["align"];
  maxWidth?: number | string;
  /** Underline control — `none` for wordmark/nav links. */
  textDecoration?: "none" | "underline";
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
  ...rest
}: AppHeadingProps) {
  return (
    <Typography
      variant={`h${level}`}
      align={align}
      sx={{ fontSize, fontWeight, lineHeight, color, maxWidth, textDecoration }}
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
  ...rest
}: AppTextProps) {
  return (
    <Typography
      variant={variant}
      align={align}
      sx={{ fontSize, fontWeight, lineHeight, color, maxWidth, textDecoration }}
      {...rest}
    />
  );
}

// ─── Actions / inputs (thin, theme-styled) ───────────────────────────────────

export type AppButtonProps = Omit<ButtonProps, "sx">;
/** CTA / text button — styling from the theme's MuiButton overrides. */
export function AppButton(props: AppButtonProps) {
  return <Button {...props} />;
}

export type AppIconButtonProps = Omit<IconButtonProps, "sx">;
/** Icon-only button (e.g. the wizard back arrow) — 44px target, inherits ink. */
export function AppIconButton(props: AppIconButtonProps) {
  return <IconButton sx={{ width: 44, height: 44, color: "text.primary" }} {...props} />;
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
export function AppField({ options, children, ...props }: AppFieldProps) {
  return (
    <TextField {...props}>
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

export type AppToggleGroupProps = Omit<ToggleButtonGroupProps, "sx"> & {
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
  borderBottom,
  overflow,
  direction,
  divider,
  padding = 2.5,
  component = "div",
  id,
  role,
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
    <Box component={component} id={id} role={role} aria-live={ariaLive} sx={layoutSx(layout, base)}>
      {children}
    </Box>
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
