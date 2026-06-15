import { setRequestLocale } from "next-intl/server";
import { cookies, draftMode } from "next/headers";
import { notFound } from "next/navigation";

import { toIso } from "@sorrel/domain";

import { getRecipes } from "../../../../lib/cms";
import { stepFromSegment } from "../state";
import { RecipesStep, StepScreen } from "../steps";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function WizardStepPage({
  params,
}: {
  params: Promise<{ locale: string; step: string }>;
}) {
  const { locale, step } = await params;
  setRequestLocale(locale);
  const funnelStep = stepFromSegment(step);
  if (!funnelStep) notFound();

  // Spec 034: compute `today` on the server so the DeliveryDatePicker's first
  // client render hydrates against an identical seed (no SSR/CSR drift on the
  // closed-card day number). The `sorrel_e2e_today` cookie lets Cypress pin the
  // SSR date (cy.clock can only stub the browser, not the server). The override
  // is honoured in `next dev` (NODE_ENV !== "production") and in the Cypress
  // production-build e2e job (NEXT_PUBLIC_E2E === "1"), but never in the Vercel
  // production deploy where neither holds — so the real date always wins there.
  // Mirrors the `__sorrelVariant` override gate in `useVariant`.
  const cookieStore = await cookies();
  const e2eHooksEnabled =
    process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_E2E === "1";
  const eToday = e2eHooksEnabled ? cookieStore.get("sorrel_e2e_today")?.value : undefined;
  const today = eToday && ISO_DATE_RE.test(eToday) ? eToday : toIso(new Date());

  // RECIPES is CMS-driven: fetch editorial content server-side, render the picker.
  if (funnelStep === "RECIPES") {
    const { isEnabled } = await draftMode();
    const recipes = await getRecipes(locale, isEnabled);
    return <RecipesStep recipes={recipes} />;
  }

  return <StepScreen step={funnelStep} today={today} />;
}
