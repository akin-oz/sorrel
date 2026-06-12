"use client";

import { useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";

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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center" }}>
        <Chip
          label={t("all")}
          onClick={() => setFilter(null)}
          color={filter === null ? "primary" : "default"}
          variant={filter === null ? "filled" : "outlined"}
        />
        {DIETARY_TAGS.map((tag) => (
          <Chip
            key={tag}
            label={t(`tags.${tag}`)}
            onClick={() => setFilter(tag)}
            color={filter === tag ? "primary" : "default"}
            variant={filter === tag ? "filled" : "outlined"}
          />
        ))}
      </Box>

      {shown.map((recipe) => {
        const selected = state.recipeSlugs.includes(recipe.slug);
        return (
          <Box key={recipe.slug} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <RecipeCard blok={recipe} />
            <Button
              onClick={() => dispatch({ type: "TOGGLE_RECIPE", slug: recipe.slug })}
              variant={selected ? "contained" : "outlined"}
              aria-pressed={selected}
            >
              {selected ? t("added") : t("add")}
            </Button>
          </Box>
        );
      })}

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
        {t("selected", { count: state.recipeSlugs.length })}
      </Typography>
    </Box>
  );
}
