"use client";

import { type ReactNode } from "react";

import Box from "@mui/material/Box";
import Button, { type ButtonProps } from "@mui/material/Button";
import Chip, { type ChipProps } from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Skeleton, { type SkeletonProps } from "@mui/material/Skeleton";
import TextField, { type TextFieldProps } from "@mui/material/TextField";
import ToggleButton, { type ToggleButtonProps } from "@mui/material/ToggleButton";
import ToggleButtonGroup, { type ToggleButtonGroupProps } from "@mui/material/ToggleButtonGroup";
import Typography, { type TypographyProps } from "@mui/material/Typography";

import { type Responsive } from "./layout";

/**
 * Semantic App* components (spec 018). Styling is baked in here (these may use
 * MUI `sx` internally — the ban is only on apps/web call sites); apps/web passes
 * intent props, never CSS. A curated set of type props (fontSize/lineHeight/…)
 * is exposed where the design genuinely varies, kept off the freeform `sx` system.
 */

// ─── Type ──────────────────────────────────────────────────────────────────

interface TypeTuning {
  /** Override font size — number (px) or responsive object. Tokenised, not freeform CSS. */
  fontSize?: Responsive<number | string>;
  lineHeight?: number | string;
  /** A palette path ("text.secondary") or a token hex from the design. */
  color?: string;
  align?: TypographyProps["align"];
  maxWidth?: number | string;
}

type AppHeadingProps = TypeTuning & {
  level: 1 | 2 | 3;
  component?: TypographyProps["component"];
  children: ReactNode;
};

/** Serif heading (h1–h3 from the theme), with optional per-instance size. */
export function AppHeading({
  level,
  fontSize,
  lineHeight,
  color,
  align,
  maxWidth,
  ...rest
}: AppHeadingProps) {
  return (
    <Typography
      variant={`h${level}`}
      align={align}
      sx={{ fontSize, lineHeight, color, maxWidth }}
      {...rest}
    />
  );
}

type AppTextProps = TypeTuning & {
  variant?: "body1" | "body2" | "overline" | "caption";
  fontWeight?: number;
  component?: TypographyProps["component"];
  id?: string;
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
  ...rest
}: AppTextProps) {
  return (
    <Typography
      variant={variant}
      align={align}
      sx={{ fontSize, fontWeight, lineHeight, color, maxWidth }}
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

export type AppChipProps = Omit<ChipProps, "sx">;
export function AppChip(props: AppChipProps) {
  return <Chip {...props} />;
}

export type AppSkeletonProps = Omit<SkeletonProps, "sx">;
export function AppSkeleton(props: AppSkeletonProps) {
  return <Skeleton {...props} />;
}

export type AppFieldProps = Omit<TextFieldProps, "sx">;
/** Text or select field (pass `select` + option children); theme-styled. */
export function AppField(props: AppFieldProps) {
  return <TextField {...props} />;
}

export type AppToggleGroupProps = Omit<ToggleButtonGroupProps, "sx">;
/** Equal-width segmented selector (frequency, cat count). */
export function AppToggleGroup(props: AppToggleGroupProps) {
  return (
    <ToggleButtonGroup
      exclusive
      color="primary"
      sx={{ alignSelf: "stretch", "& .MuiToggleButton-root": { flex: 1, py: 1.25 } }}
      {...props}
    />
  );
}

export type AppToggleOptionProps = Omit<ToggleButtonProps, "sx">;
export function AppToggleOption(props: AppToggleOptionProps) {
  return <ToggleButton {...props} />;
}

// ─── Surface ──────────────────────────────────────────────────────────────

interface AppCardProps {
  /** Inner padding on the theme spacing scale. */
  padding?: number;
  component?: React.ElementType;
  id?: string;
  children: ReactNode;
}

/** Bordered, rounded surface — recipe cards, the plan/summary panels, FAQ rows. */
export function AppCard({ padding = 2.5, component, id, children }: AppCardProps) {
  return (
    <Box
      component={component ?? "div"}
      id={id}
      sx={{
        p: padding,
        borderRadius: "16px",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      {children}
    </Box>
  );
}

// ─── Dialog ──────────────────────────────────────────────────────────────────

interface AppDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  body?: string;
  /** Footer actions (buttons). */
  actions?: ReactNode;
  "aria-label"?: string;
}

export function AppDialog({ open, onClose, title, body, actions }: AppDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      {body ? (
        <DialogContent>
          <DialogContentText>{body}</DialogContentText>
        </DialogContent>
      ) : null}
      {actions ? <DialogActions>{actions}</DialogActions> : null}
    </Dialog>
  );
}
