import { getTranslations, setRequestLocale } from "next-intl/server";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";

import { AppBox, AppLink, AppStack, AppText } from "@sorrel/ui";

import { Link } from "../../../../i18n/navigation";
import { getRecipes } from "../../../../lib/cms";
import { RecipeCard } from "../../../_cms/RecipeCard";

/**
 * Recipe detail / preview page (spec 011). Recipes are a CMS content type with no
 * page of their own in the funnel — they render as cards in the landing showcase
 * and as options in the wizard. This route gives each recipe a real, previewable
 * URL so Storyblok's Visual Editor can open and edit a recipe directly (its
 * `path` points here), and so recipe edits are visible in draft mode.
 */
export default async function RecipePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const { isEnabled } = await draftMode();
  const recipe = (await getRecipes(locale, isEnabled)).find((r) => r.slug === slug);
  if (!recipe) notFound();

  const t = await getTranslations("Recipes");

  return (
    <AppStack
      component="main"
      maxWidth={600}
      mx="auto"
      width="100%"
      px={{ xs: 2, sm: 3 }}
      py={{ xs: 4, md: 8 }}
      gap={2.5}
    >
      <AppText variant="body2" color="text.secondary">
        <AppLink href="/" component={Link} color="inherit">
          ← Sorrel
        </AppLink>
      </AppText>
      <AppBox maxWidth={440}>
        <RecipeCard blok={recipe} />
      </AppBox>
      <AppText variant="body2" color="text.secondary">
        {t("all")}: /recipes/{recipe.slug}
      </AppText>
    </AppStack>
  );
}
