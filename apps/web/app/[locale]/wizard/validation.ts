/**
 * Per-step funnel validation (spec 020) — pure, framework-free, unit-tested.
 *
 * One source of truth for "can this step complete": the chrome gates Continue on
 * `valid`, the forms render `errors` inline, and `field_error` analytics key off
 * the same codes. The EMAIL rule is the same `validateEmail` the server action
 * uses, so client and server can never disagree.
 */
import { FUNNEL_STEPS, type FunnelStep } from "@sorrel/shared";

import { validateEmail } from "./email-validation";
import type { FunnelState } from "./state";

export type FieldErrorCode = "required" | "invalid" | "min";

export interface StepValidity {
  valid: boolean;
  /** Field name → error code, for inline messages + `field_error` emits. */
  errors: Record<string, FieldErrorCode>;
}

function result(errors: Record<string, FieldErrorCode>): StepValidity {
  return { valid: Object.keys(errors).length === 0, errors };
}

export function stepValidity(step: FunnelStep, state: FunnelState): StepValidity {
  switch (step) {
    case "CATS":
      // The count selector clamps to 1–4; always valid.
      return result({});
    case "PROFILE": {
      const cat = state.cats[0];
      const errors: Record<string, FieldErrorCode> = {};
      if (!cat?.name?.trim()) errors.name = "required";
      if (!cat?.age?.trim()) errors.age = "required";
      if (!cat?.weight?.trim()) errors.weight = "required";
      return result(errors);
    }
    case "RECIPES":
      return result(state.recipeSlugs.length > 0 ? {} : { recipes: "min" });
    case "DELIVERY":
      return result(state.deliveryDate ? {} : { deliveryDate: "required" });
    case "PLAN":
      return result(state.frequency ? {} : { frequency: "required" });
    case "EMAIL": {
      const { error } = validateEmail(state.email ?? "");
      return result(error ? { email: error } : {});
    }
    case "SUMMARY": {
      // Complete only when every prior step is valid.
      const priorSteps = FUNNEL_STEPS.slice(0, FUNNEL_STEPS.indexOf("SUMMARY"));
      const valid = priorSteps.every((s) => stepValidity(s, state).valid);
      return { valid, errors: {} };
    }
  }
}
