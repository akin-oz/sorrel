"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { storyblokEditable } from "@storyblok/react/rsc";

import { sorrelTheme } from "@sorrel/ui";

import type { RecipeShowcaseBlok } from "../../types/storyblok.gen";
import { Band } from "./Band";
import { useLandingRecipes } from "./LandingRecipesProvider";
import { RecipeCard } from "./RecipeCard";

export function RecipeShowcase({ blok }: { blok: RecipeShowcaseBlok }) {
  const recipes = useLandingRecipes();
  return (
    <Band
      editable={storyblokEditable(blok)}
      id="recipes"
      bg="background.paper"
      innerSx={{
        py: { xs: 5.5, md: 10 },
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2.25, md: 3.5 },
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { md: "flex-end" },
          justifyContent: { md: "space-between" },
          gap: { xs: 0.75, md: 3 },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 0.75, md: 1 } }}>
          <Typography
            variant="overline"
            sx={{ fontSize: { xs: 11, md: 12 }, color: sorrelTheme.mono }}
          >
            {blok.eyebrow}
          </Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: 24, md: 32 } }}>
            {blok.heading}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: { xs: 14, md: 15 }, pb: { md: 0.5 } }}
        >
          {blok.subcopy}
        </Typography>
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
          gap: { xs: 1.75, md: 2.5 },
        }}
      >
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.slug} blok={recipe} />
        ))}
      </Box>
    </Band>
  );
}
