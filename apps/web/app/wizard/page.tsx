import { redirect } from "next/navigation";

import { FUNNEL_STEPS } from "@sorrel/shared";

import { segmentForStep } from "./state";

export default function WizardIndex() {
  redirect(`/wizard/${segmentForStep(FUNNEL_STEPS[0])}`);
}
