/**
 * Wizard state machine (spec 010) — pure, framework-free, unit-tested.
 *
 * The client-side funnel draft and the reducer that drives it. Field names mirror
 * the GraphQL `FunnelDraft` (minus the server-only `id` / `updatedAt`). Kept pure
 * so it tests with no DOM and no React — the shell's safety net.
 */
import { FUNNEL_STEPS, type FunnelStep } from "@sorrel/shared";

/** A cat being configured. Fields grow when the CATS step form lands (its own spec). */
export interface CatDraft {
  name: string;
}

export interface FunnelState {
  /** Cats being fed. Collected on CATS (form is a later spec). */
  cats: CatDraft[];
  /** Chosen recipe slugs. Collected on RECIPES (form is a later spec). */
  recipeSlugs: string[];
  /** Selected delivery date, ISO YYYY-MM-DD. Set on DELIVERY by the picker. */
  deliveryDate: string | null;
  /** Box frequency (the schema's BoxFrequency value). Set on PLAN (a later spec). */
  frequency: string | null;
  /** Email captured on EMAIL (a later spec). */
  email: string | null;
  /** Furthest step reached — drives the progress bar and resume. */
  furthestStep: FunnelStep;
}

export const initialFunnelState: FunnelState = {
  cats: [],
  recipeSlugs: [],
  deliveryDate: null,
  frequency: null,
  email: null,
  furthestStep: "CATS",
};

export type FunnelAction =
  | { type: "HYDRATE"; state: FunnelState }
  | { type: "ADVANCE"; step: FunnelStep }
  | { type: "SET_DELIVERY_DATE"; date: string }
  | { type: "SET_FREQUENCY"; frequency: string }
  | { type: "TOGGLE_RECIPE"; slug: string }
  | { type: "RESET" };

/** Index of a step in funnel order. */
function stepIndex(step: FunnelStep): number {
  return FUNNEL_STEPS.indexOf(step);
}

/** The later of two steps in funnel order. */
function furthest(a: FunnelStep, b: FunnelStep): FunnelStep {
  return stepIndex(b) > stepIndex(a) ? b : a;
}

export function funnelReducer(state: FunnelState, action: FunnelAction): FunnelState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;
    case "ADVANCE":
      return { ...state, furthestStep: furthest(state.furthestStep, action.step) };
    case "SET_DELIVERY_DATE":
      return { ...state, deliveryDate: action.date };
    case "SET_FREQUENCY":
      return { ...state, frequency: action.frequency };
    case "TOGGLE_RECIPE":
      return {
        ...state,
        recipeSlugs: state.recipeSlugs.includes(action.slug)
          ? state.recipeSlugs.filter((slug) => slug !== action.slug)
          : [...state.recipeSlugs, action.slug],
      };
    case "RESET":
      return initialFunnelState;
  }
}

/** The step after `step` in funnel order; clamps at the last step. */
export function nextStep(step: FunnelStep): FunnelStep {
  return FUNNEL_STEPS[Math.min(stepIndex(step) + 1, FUNNEL_STEPS.length - 1)];
}

/** The step before `step` in funnel order; clamps at the first step. */
export function prevStep(step: FunnelStep): FunnelStep {
  return FUNNEL_STEPS[Math.max(stepIndex(step) - 1, 0)];
}

/** Lower-case URL segment for a step, e.g. "CATS" -> "cats". */
export function segmentForStep(step: FunnelStep): string {
  return step.toLowerCase();
}

/** Resolve a URL segment back to its `FunnelStep`, or null if unknown. */
export function stepFromSegment(segment: string): FunnelStep | null {
  return FUNNEL_STEPS.find((step) => step.toLowerCase() === segment.toLowerCase()) ?? null;
}

export const isFirstStep = (step: FunnelStep): boolean => stepIndex(step) === 0;
export const isLastStep = (step: FunnelStep): boolean =>
  stepIndex(step) === FUNNEL_STEPS.length - 1;
