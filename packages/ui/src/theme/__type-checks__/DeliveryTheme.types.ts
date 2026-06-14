/**
 * Spec 031 (U-29): structural compile-check that both brand theme objects
 * satisfy `DeliveryTheme` without `as` widening. Adding a key to
 * `DeliveryTheme` but missing it from either `sorrelTheme` or `brambleTheme`
 * fails `yarn type-check` HERE — before any unit test runs.
 *
 * The exports are intentional: keeping them as side-effect statements would
 * trigger `@typescript-eslint/no-unused-vars`. Exporting them makes the
 * checks part of the package's typed surface, which is harmless (the values
 * are the same theme objects re-exported via index.ts).
 */
import type { DeliveryTheme } from "../tokens";
import { brambleTheme, sorrelTheme } from "../tokens";

export const DELIVERY_THEME_STRUCTURAL_CHECK_SORREL: DeliveryTheme = sorrelTheme;
export const DELIVERY_THEME_STRUCTURAL_CHECK_BRAMBLE: DeliveryTheme = brambleTheme;
