import { setRequestLocale } from "next-intl/server";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";

import { getRecipes } from "../../../../lib/cms";
import { stepFromSegment } from "../state";
import { RecipesStep, StepScreen } from "../steps";

export default async function WizardStepPage({
  params,
}: {
  params: Promise<{ locale: string; step: string }>;
}) {
  const { locale, step } = await params;
  setRequestLocale(locale);
  const funnelStep = stepFromSegment(step);
  if (!funnelStep) notFound();

  // RECIPES is CMS-driven: fetch editorial content server-side, render the picker.
  if (funnelStep === "RECIPES") {
    const { isEnabled } = await draftMode();
    const recipes = await getRecipes(locale, isEnabled);
    return <RecipesStep recipes={recipes} />;
  }

  return <StepScreen step={funnelStep} />;
}
