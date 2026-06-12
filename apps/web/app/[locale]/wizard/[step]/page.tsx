import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { stepFromSegment } from "../state";
import { StepScreen } from "../steps";

export default async function WizardStepPage({
  params,
}: {
  params: Promise<{ locale: string; step: string }>;
}) {
  const { locale, step } = await params;
  setRequestLocale(locale);
  const funnelStep = stepFromSegment(step);
  if (!funnelStep) notFound();
  return <StepScreen step={funnelStep} />;
}
