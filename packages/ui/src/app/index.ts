/** The App* adaptive layer (spec 018) — MUI wrapped behind tokenized, intent-prop
 *  components so apps/web composes UI without inline `sx` or raw `@mui` imports. */
export { AppThemeProvider } from "./AppThemeProvider";
export { appTheme } from "./theme";
export { appTokens } from "./tokens";

export { AppStack, AppBox, AppContainer, AppGrid } from "./primitives";
export type { AppStackProps, AppBoxProps, AppContainerProps, AppGridProps } from "./primitives";

export {
  AppHeading,
  AppText,
  AppButton,
  AppIconButton,
  AppChip,
  AppSkeleton,
  AppAlert,
  AppField,
  AppToggleGroup,
  AppToggleOption,
  AppCard,
  AppProgressBar,
  AppDialog,
} from "./components";
export type {
  AppButtonProps,
  AppIconButtonProps,
  AppChipProps,
  AppSkeletonProps,
  AppAlertProps,
  AppFieldProps,
  AppToggleGroupProps,
  AppToggleOptionProps,
} from "./components";
