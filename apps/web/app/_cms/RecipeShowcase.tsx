"use client";

import { storyblokEditable } from "@storyblok/react/rsc";

import { AppBand, AppBox, AppGrid, AppHeading, AppStack, AppText, sorrelTheme } from "@sorrel/ui";

import type { RecipeShowcaseBlok } from "../../types/storyblok.gen";
import { useLandingRecipes } from "./LandingRecipesProvider";
import { RecipeCard } from "./RecipeCard";

export function RecipeShowcase({ blok }: { blok: RecipeShowcaseBlok }) {
  const recipes = useLandingRecipes();
  return (
    <AppBand tone="paper" id="recipes" editable={storyblokEditable(blok)}>
      <AppStack gap={{ xs: 2.25, md: 3.5 }} py={{ xs: 5.5, md: 10 }}>
        <AppStack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ md: "flex-end" }}
          justifyContent={{ md: "space-between" }}
          gap={{ xs: 0.75, md: 3 }}
        >
          <AppStack gap={{ xs: 0.75, md: 1 }}>
            <AppText variant="overline" color={sorrelTheme.mono} fontSize={{ xs: 11, md: 12 }}>
              {blok.eyebrow}
            </AppText>
            <AppHeading level={2} fontSize={{ xs: 24, md: 32 }}>
              {blok.heading}
            </AppHeading>
          </AppStack>
          <AppBox pb={{ md: 0.5 }}>
            <AppText variant="body2" color="text.secondary" fontSize={{ xs: 14, md: 15 }}>
              {blok.subcopy}
            </AppText>
          </AppBox>
        </AppStack>
        <AppGrid columns={{ xs: "1fr", md: "1fr 1fr 1fr" }} gap={{ xs: 1.75, md: 2.5 }}>
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.slug} blok={recipe} />
          ))}
        </AppGrid>
      </AppStack>
    </AppBand>
  );
}
