/** The App* adaptive layer (spec 018) — MUI wrapped behind tokenized, intent-prop
 *  components so apps/web composes UI without inline `sx` or raw `@mui` imports. */
export { AppThemeProvider } from "./AppThemeProvider";
export { appTheme } from "./theme";

export { AppStack, AppBox, AppContainer, AppGrid } from "./primitives";
export type { AppStackProps, AppBoxProps, AppContainerProps, AppGridProps } from "./primitives";

export {
  AppHeading,
  AppText,
  AppButton,
  AppChip,
  AppSkeleton,
  AppField,
  AppToggleGroup,
  AppToggleOption,
  AppCard,
  AppDialog,
} from "./components";
export type {
  AppButtonProps,
  AppChipProps,
  AppSkeletonProps,
  AppFieldProps,
  AppToggleGroupProps,
  AppToggleOptionProps,
} from "./components";
