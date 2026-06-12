/**
 * Canonical funnel-step identity for the Sorrel funnel (spec 009).
 *
 * `FunnelStep` necessarily exists in two places: the GraphQL `FunnelStep` enum
 * (the network boundary, generated into server types) and this app-side tuple
 * (routing, analytics, wizard state — none of which can import the server's
 * generated types). The schema-sync test in `funnel.test.ts` keeps the two
 * mutually binding so neither can silently drift from the other.
 */

/** The seven wizard steps, in funnel order. The index drives progress. */
export const FUNNEL_STEPS = [
  "CATS",
  "PROFILE",
  "RECIPES",
  "DELIVERY",
  "PLAN",
  "EMAIL",
  "SUMMARY",
] as const;

/** The app-side step union, derived from the ordered tuple. */
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

/** Narrow an arbitrary string (e.g. a route segment) to a `FunnelStep`. */
export function isFunnelStep(value: string): value is FunnelStep {
  return (FUNNEL_STEPS as readonly string[]).includes(value);
}
