"use client";

import { storyblokEditable } from "@storyblok/react/rsc";
import { useTranslations } from "next-intl";

import { AppCard, AppChip, AppHeading, AppImage, AppStack, AppText, appTokens } from "@sorrel/ui";

import { isDietaryTag } from "../../lib/dietary";
import type { RecipeBlok } from "../../types/storyblok.gen";

export function RecipeCard({ blok }: { blok: RecipeBlok }) {
  const t = useTranslations("Recipes");
  return (
    <AppCard
      tone="surface"
      radius={`${appTokens.radius.surface}px`}
      overflow="hidden"
      padding={0}
      editable={storyblokEditable(blok)}
    >
      <AppImage
        src={blok.image?.filename}
        alt={blok.image?.alt || blok.name}
        height={120}
        fallbackBackground="repeating-linear-gradient(45deg,#F1E7D9,#F1E7D9 10px,#EBDFCE 10px,#EBDFCE 20px)"
      />
      <AppStack p={2} gap={1}>
        <AppHeading level={3} fontSize="1.1rem" fontWeight={600}>
          {blok.name}
        </AppHeading>
        <AppText variant="body2" color="text.secondary">
          {blok.description}
        </AppText>
        <AppStack direction="row" wrap gap={0.75} mt={0.5}>
          {blok.dietaryTags.filter(isDietaryTag).map((tag) => (
            <AppChip key={tag} label={t(`tags.${tag}`)} size="small" variant="outlined" />
          ))}
        </AppStack>
      </AppStack>
    </AppCard>
  );
}
