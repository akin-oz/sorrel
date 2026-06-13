import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";

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
    <Container
      maxWidth="sm"
      sx={{ py: { xs: 4, md: 8 }, display: "flex", flexDirection: "column", gap: 2.5 }}
    >
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
          ← Sorrel
        </Link>
      </Typography>
      <Box sx={{ maxWidth: 440 }}>
        <RecipeCard blok={recipe} />
      </Box>
      <Typography variant="body2" color="text.secondary">
        {t("all")}: /recipes/{recipe.slug}
      </Typography>
    </Container>
  );
}
