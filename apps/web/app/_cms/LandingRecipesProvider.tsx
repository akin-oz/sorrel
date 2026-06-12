"use client";

import { type ReactNode, createContext, useContext } from "react";

import type { RecipeBlok } from "../../types/storyblok.gen";

/**
 * Hands the server-fetched recipe stories (`getRecipes` — CMS or fallback) to the
 * `recipe_showcase` blok, which is copy-only by contract (spec 012): recipe
 * content stays single-sourced under its slug, never duplicated into the blok.
 */
const LandingRecipesContext = createContext<RecipeBlok[]>([]);

export function LandingRecipesProvider({
  recipes,
  children,
}: {
  recipes: RecipeBlok[];
  children: ReactNode;
}) {
  return (
    <LandingRecipesContext.Provider value={recipes}>{children}</LandingRecipesContext.Provider>
  );
}

export function useLandingRecipes(): RecipeBlok[] {
  return useContext(LandingRecipesContext);
}
