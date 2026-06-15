/**
 * Funnel seed (spec 014) — synthetic sessions through the typed event contract,
 * producing a drop-off curve split by A/B variant. The whole point of the thesis:
 * the PROFILE autocomplete (variant B) lifts the PROFILE→RECIPES retention, so the
 * curve shows where the lever moves the number.
 *
 * Deterministic (no RNG) so the committed JSON has clean diffs. Emits real
 * `FunnelEvent`s into `memorySink`, then aggregates them — the script speaks the
 * same firewall the app does, not a parallel data shape.
 *
 *   yarn workspace @sorrel/frontend seed   (writes lib/insights-data.json)
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createMemorySink, createTracker } from "@sorrel/analytics";
import { FUNNEL_STEPS } from "@sorrel/shared";

import { RETENTION, type SeedVariant as Variant } from "../lib/seed-retention";

const SESSIONS_PER_VARIANT = 1000;

/** How many sessions reach each step, given a starting cohort + retention. */
function viewedCounts(retention: ReadonlyArray<number>): number[] {
  const viewed = [SESSIONS_PER_VARIANT];
  for (let i = 0; i < retention.length; i += 1) {
    viewed.push(Math.round(viewed[i] * retention[i]));
  }
  return viewed;
}

/** Emit one session's events: views 0..furthest, completes 0..furthest-1, abandons. */
function emitSession(track: ReturnType<typeof createTracker>, variant: Variant, furthest: number) {
  for (let i = 0; i <= furthest; i += 1) {
    track({ name: "funnel_step_viewed", step: FUNNEL_STEPS[i], variant });
    if (i < furthest) track({ name: "step_completed", step: FUNNEL_STEPS[i], variant });
  }
  const last = FUNNEL_STEPS.length - 1;
  if (furthest < last) {
    track({ name: "funnel_abandoned", step: FUNNEL_STEPS[furthest] });
  } else {
    track({ name: "step_completed", step: FUNNEL_STEPS[last], variant });
  }
}

function seedVariant(variant: Variant) {
  const sink = createMemorySink();
  const track = createTracker(sink);
  const viewed = viewedCounts(RETENTION[variant]);

  // Sessions dropping at step i = viewed[i] - viewed[i+1]; the rest reach SUMMARY.
  for (let i = 0; i < FUNNEL_STEPS.length - 1; i += 1) {
    const dropping = viewed[i] - viewed[i + 1];
    for (let n = 0; n < dropping; n += 1) emitSession(track, variant, i);
  }
  const converters = viewed[FUNNEL_STEPS.length - 1];
  for (let n = 0; n < converters; n += 1) emitSession(track, variant, FUNNEL_STEPS.length - 1);

  // Aggregate from the emitted events — the contract pipeline, not a shortcut.
  const viewedByStep = FUNNEL_STEPS.map(
    (step) => sink.events.filter((e) => e.name === "funnel_step_viewed" && e.step === step).length,
  );
  const completion = viewedByStep[FUNNEL_STEPS.length - 1] / viewedByStep[0];
  return { viewed: viewedByStep, completionRate: Number(completion.toFixed(4)) };
}

const data = {
  sessionsPerVariant: SESSIONS_PER_VARIANT,
  steps: [...FUNNEL_STEPS],
  variants: { A: seedVariant("A"), B: seedVariant("B") },
};

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "lib", "insights-data.json");
writeFileSync(out, `${JSON.stringify(data, null, 2)}\n`);
console.warn(
  `[seed] wrote ${out} — A ${data.variants.A.completionRate}, B ${data.variants.B.completionRate}`,
);
