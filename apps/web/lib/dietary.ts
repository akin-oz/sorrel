/**
 * The dietary-tag values used by CMS recipe content. They mirror the schema's
 * `DietaryTag` enum so the Storyblok editorial joins cleanly to the GraphQL
 * funnel data by these codes — asserted by dietary.test.ts.
 */
export const DIETARY_TAGS = ["GRAIN_FREE", "CHICKEN_FREE", "SENSITIVE"] as const;

export type DietaryTag = (typeof DIETARY_TAGS)[number];

export function isDietaryTag(value: string): value is DietaryTag {
  return (DIETARY_TAGS as readonly string[]).includes(value);
}
