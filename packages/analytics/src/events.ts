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
  /** Why the user left. Absent on the passive pagehide path; "save_exit" on the
   *  deliberate Save & exit click (spec 051). */
  reason?: "save_exit";
  /** A/B bucket, carried so abandonment is attributable per variant. */
  variant?: string;
}

/** The exit-intent recovery modal was shown. */
export interface ExitIntentShown {
  name: "exit_intent_shown";
  /** Step the recovery modal was shown on. */
  step: FunnelStep;
  /** A/B bucket, carried so the recovery ratio is attributable per variant. */
  variant?: string;
}

/** The user chose "keep going" instead of leaving — the recovery win. */
export interface ExitIntentRecovered {
  name: "exit_intent_recovered";
  step: FunnelStep;
  /** A/B bucket, carried so the recovery ratio is attributable per variant. */
  variant?: string;
}

/** Spec 039: the server returned a Stripe PaymentIntent `client_secret`. */
export interface PaymentIntentCreated {
  name: "payment_intent_created";
  step: "CHECKOUT";
  /** Amount in minor units (cents/pence) — mirrors `packages/domain`'s Money type. */
  amount_minor: number;
  currency: string;
  /** A/B bucket carried for variant-split payment analysis (spec 043). */
  variant?: string;
}

/** Spec 039: `stripe.confirmPayment` resolved with `status: "succeeded"`. */
export interface PaymentSucceeded {
  name: "payment_succeeded";
  step: "CHECKOUT";
  intent_id: string;
  variant?: string;
}

/** Spec 039: `stripe.confirmPayment` resolved with an error or a non-`succeeded` status. */
export interface PaymentFailed {
  name: "payment_failed";
  step: "CHECKOUT";
  /** Null when the SDK reported an error before the intent surfaced. */
  intent_id: string | null;
  /** Stripe error `code` (e.g. `card_declined`) or `"unknown"`. */
  code: string;
  variant?: string;
}

export type FunnelEvent =
  | FunnelStepViewed
  | StepCompleted
  | FieldError
  | FunnelAbandoned
  | ExitIntentShown
  | ExitIntentRecovered
  | PaymentIntentCreated
  | PaymentSucceeded
  | PaymentFailed;

/** The set of valid event names, derived from the union. */
export type FunnelEventName = FunnelEvent["name"];
