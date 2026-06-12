import { notFound } from "next/navigation";

import { stepFromSegment } from "../state";
import { StepScreen } from "../steps";

export default async function WizardStepPage({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  const funnelStep = stepFromSegment(step);
  if (!funnelStep) notFound();
  return <StepScreen step={funnelStep} />;
}
