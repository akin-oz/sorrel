/**
 * PostHog funnel seed (spec 014) — the PostHog twin of seed-mixpanel.ts. Ingests
 * synthetic sessions through the typed event contract into the live PostHog project
 * (capture `/batch`), so the demo's funnel insight + dashboard have data.
 *
 * Same canonical drop-off as seed-funnel.ts / seed-mixpanel.ts: variant B (PROFILE
 * autocomplete with smart defaults) lifts PROFILE→RECIPES over variant A (inline
 * pills, every option visible) — a credible control, so the gap is real but smaller.
 * Deterministic ($insert_id stable per event), so PostHog dedups re-runs. PostHog
 * accepts historical timestamps, so sessions spread across the trailing two weeks.
 *
 *   NEXT_PUBLIC_POSTHOG_KEY=… yarn workspace @sorrel/frontend seed:posthog
 *
 * Reads the key/host from apps/web/.env when not already in the environment.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { FunnelEvent } from "@sorrel/analytics";
import { FUNNEL_STEPS } from "@sorrel/shared";

import { RETENTION, type SeedVariant as Variant } from "../lib/seed-retention";

const SESSIONS_PER_VARIANT = 300;
const DAYS = 14; // PostHog accepts historical timestamps; spread across two weeks
const BATCH = 100;

// ── Env ──────────────────────────────────────────────────────────────────────
const scriptDir = dirname(fileURLToPath(import.meta.url));
function loadEnv(): Record<string, string> {
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) return process.env as Record<string, string>;
  try {
    const raw = readFileSync(join(scriptDir, "..", ".env"), "utf8");
    const env: Record<string, string> = { ...process.env } as Record<string, string>;
    for (const line of raw.split("\n")) {
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const i = line.indexOf("=");
      env[line.slice(0, i).trim()] = line
        .slice(i + 1)
        .trim()
        .replace(/^"|"$/g, "");
    }
    return env;
  } catch {
    return process.env as Record<string, string>;
  }
}
const env = loadEnv();
const KEY = env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = (env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com").replace(/\/$/, "");
if (!KEY) {
  console.error("[seed:posthog] NEXT_PUBLIC_POSTHOG_KEY is required");
  process.exit(1);
}

// ── Payload buffer ─────────────────────────────────────────────────────────
interface CaptureEvent {
  event: string;
  properties: Record<string, unknown>;
  timestamp: string;
}
const queue: CaptureEvent[] = [];

/** Enqueue a typed FunnelEvent as a PostHog capture event with transport metadata. */
function send(event: FunnelEvent, distinctId: string, timeSec: number, insertId: string) {
  const { name, ...props } = event;
  queue.push({
    event: name,
    properties: { distinct_id: distinctId, $insert_id: insertId, seed: true, ...props },
    timestamp: new Date(timeSec * 1000).toISOString(),
  });
}

const NOW = Math.floor(Date.now() / 1000);

/** One session: views 0..furthest, completes 0..furthest-1; abandons or converts.
 *  Variant A drops a little more at PROFILE; pills emit no per-field error (spec 022 —
 *  the signal is the disabled-Continue gate, not a field_error). */
function emitSession(variant: Variant, furthest: number, index: number) {
  const distinctId = `seed_${variant}_${index}`;
  const start = NOW - (index % DAYS) * 86400 - (index % 11) * 3600 - 600;
  let seq = 0;
  const at = () => start + seq * 30;
  const id = () => `${distinctId}:${seq}`;

  // Spec 049: ~20% of sessions are returning users resuming a previous draft.
  // resumed_from = one step behind furthest (simulates typical resume pattern).
  if (index % 5 === 0 && furthest > 0) {
    const resumedFrom = FUNNEL_STEPS[Math.max(0, furthest - 1)];
    send(
      { name: "funnel_draft_resumed", step: FUNNEL_STEPS[0], resumed_from: resumedFrom, variant },
      distinctId,
      at(),
      id(),
    );
    seq += 1;
  }

  for (let i = 0; i <= furthest; i += 1) {
    send({ name: "funnel_step_viewed", step: FUNNEL_STEPS[i], variant }, distinctId, at(), id());
    seq += 1;
    if (i < furthest) {
      send({ name: "step_completed", step: FUNNEL_STEPS[i], variant }, distinctId, at(), id());
      seq += 1;
    }
  }

  const last = FUNNEL_STEPS.length - 1;
  if (furthest < last) {
    if (index % 3 === 0) {
      send(
        { name: "exit_intent_shown", step: FUNNEL_STEPS[furthest], variant },
        distinctId,
        at(),
        id(),
      );
      seq += 1;
      if (index % 6 === 0) {
        send(
          { name: "exit_intent_recovered", step: FUNNEL_STEPS[furthest], variant },
          distinctId,
          at(),
          id(),
        );
        seq += 1;
      }
    }
    send(
      { name: "funnel_abandoned", step: FUNNEL_STEPS[furthest], variant },
      distinctId,
      at(),
      id(),
    );
  } else {
    send({ name: "step_completed", step: FUNNEL_STEPS[last], variant }, distinctId, at(), id());
  }
}

function viewedCounts(retention: ReadonlyArray<number>): number[] {
  const viewed = [SESSIONS_PER_VARIANT];
  for (let i = 0; i < retention.length; i += 1) viewed.push(Math.round(viewed[i] * retention[i]));
  return viewed;
}

function buildVariant(variant: Variant) {
  const viewed = viewedCounts(RETENTION[variant]);
  let index = 0;
  for (let i = 0; i < FUNNEL_STEPS.length - 1; i += 1) {
    const dropping = viewed[i] - viewed[i + 1];
    for (let n = 0; n < dropping; n += 1) emitSession(variant, i, index++);
  }
  const converters = viewed[FUNNEL_STEPS.length - 1];
  for (let n = 0; n < converters; n += 1) emitSession(variant, FUNNEL_STEPS.length - 1, index++);
  return { started: viewed[0], converted: converters };
}

// ── Ingest ───────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function flush() {
  let ok = 0;
  for (let i = 0; i < queue.length; i += BATCH) {
    const batch = queue.slice(i, i + BATCH);
    let posted = false;
    for (let attempt = 1; attempt <= 5 && !posted; attempt += 1) {
      const res = await fetch(`${HOST}/batch/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: KEY, batch }),
      });
      if (res.ok) posted = true;
      else if (attempt === 5) {
        console.error(`[seed:posthog] batch @${i} failed:`, res.status, await res.text());
        process.exit(1);
      } else await sleep(attempt * 500);
    }
    ok += batch.length;
    await sleep(60);
  }
  return ok;
}

async function main() {
  const summary = { A: buildVariant("A"), B: buildVariant("B") };
  const sent = await flush();
  console.warn(
    `[seed:posthog] ingested ${sent} events to ${HOST} — ` +
      `A ${summary.A.converted}/${summary.A.started}, B ${summary.B.converted}/${summary.B.started}`,
  );
}

void main();
