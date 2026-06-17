"use client";

import { useState } from "react";

import { useTranslations } from "next-intl";

import { AppButton, AppChip, AppStack, AppText } from "@sorrel/ui";

import { DIETARY_TAGS } from "../../../lib/dietary";
import type { RecipeBlok } from "../../../types/storyblok.gen";
import { RecipeCard } from "../../_cms/RecipeCard";
import { useFunnel } from "./FunnelProvider";

export function RecipesPicker({ recipes }: { recipes: RecipeBlok[] }) {
  const t = useTranslations("Recipes");
  const { state, dispatch } = useFunnel();
  const [filter, setFilter] = useState<string | null>(null);

  const shown = filter ? recipes.filter((r) => r.dietaryTags.includes(filter)) : recipes;

  return (
    <AppStack gap={2}>
      <AppStack direction="row" wrap justifyContent="center" gap={1}>
        <AppChip
          label={t("all")}
          onClick={() => setFilter(null)}
          color={filter === null ? "primary" : "default"}
          variant={filter === null ? "filled" : "outlined"}
          aria-pressed={filter === null}
        />
        {DIETARY_TAGS.map((tag) => (
          <AppChip
            key={tag}
            label={t(`tags.${tag}`)}
            onClick={() => setFilter(tag)}
            color={filter === tag ? "primary" : "default"}
            variant={filter === tag ? "filled" : "outlined"}
            aria-pressed={filter === tag}
          />
        ))}
      </AppStack>

      {shown.map((recipe) => {
        const selected = state.recipeSlugs.includes(recipe.slug);
        return (
          <AppStack key={recipe.slug} gap={1}>
            <RecipeCard blok={recipe} />
            <AppButton
              onClick={() => dispatch({ type: "TOGGLE_RECIPE", slug: recipe.slug })}
              variant={selected ? "contained" : "outlined"}
              aria-pressed={selected}
            >
              {selected ? t("added") : t("add")}
            </AppButton>
          </AppStack>
        );
      })}

      <AppText variant="body2" color="text.secondary" align="center">
        {t("selected", { count: state.recipeSlugs.length })}
      </AppText>
    </AppStack>
  );
}
