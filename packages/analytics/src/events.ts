/**
 * The typed funnel event contract (spec 009) — the conversion firewall.
 *
 * A discriminated union keyed by `name`. Every analytics emit in the app must be
 * one of these; a typo'd name or a missing prop is a compile error, not a silent
 * runtime no-op. This is the second contract in the repo, parallel to
 * `schema.graphql` — agree the event shape once, then make wrong un-mergeable.
 */
import type { FunnelStep } from "@sorrel/shared";

/** A step screen was shown. */
export interface FunnelStepViewed {
  name: "funnel_step_viewed";
  step: FunnelStep;
  /** A/B bucket, e.g. the autocomplete-postcode flag. */
  variant?: string;
}

/** A step was completed (a successful Next). */
export interface StepCompleted {
  name: "step_completed";
  step: FunnelStep;
  variant?: string;
}

/** An input failed validation. */
export interface FieldError {
  name: "field_error";
  step: FunnelStep;
  /** Which input failed. */
  field: string;
  /** Machine code, not the display copy — e.g. "required", "out_of_range". */
  error: string;
}

/** The user left the funnel without completing it. */
export interface FunnelAbandoned {
  name: "funnel_abandoned";
  /** Furthest step reached before leaving. */
  step: FunnelStep;
}

/** The exit-intent recovery modal was shown. */
export interface ExitIntentShown {
  name: "exit_intent_shown";
  /** Step the recovery modal was shown on. */
  step: FunnelStep;
}

/** The user chose "keep going" instead of leaving — the recovery win. */
export interface ExitIntentRecovered {
  name: "exit_intent_recovered";
  step: FunnelStep;
}

export type FunnelEvent =
  | FunnelStepViewed
  | StepCompleted
  | FieldError
  | FunnelAbandoned
  | ExitIntentShown
  | ExitIntentRecovered;

/** The set of valid event names, derived from the union. */
export type FunnelEventName = FunnelEvent["name"];
