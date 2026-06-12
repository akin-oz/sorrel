import { FUNNEL_STEPS } from "@sorrel/shared";

import { redirect } from "../../../i18n/navigation";
import { segmentForStep } from "./state";

export default async function WizardIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: `/wizard/${segmentForStep(FUNNEL_STEPS[0])}`, locale });
}
