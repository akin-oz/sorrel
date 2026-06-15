/**
 * Mixpanel funnel seed (spec 014) — ingests synthetic sessions through the typed
 * event contract into the live Mixpanel project, so the demo's funnel report,
 * variant breakdown, and dashboard have data (and the lexicon has every event).
 *
 * Same canonical drop-off as `seed-funnel.ts` (the in-app insights JSON): the
 * PROFILE autocomplete with smart defaults (variant B) lifts PROFILE→RECIPES over
 * inline pills (variant A, every option visible), so the funnel shows the 39→65
 * lever against a credible control. Deterministic ($insert_id is stable per event),
 * so re-running dedups in Mixpanel rather than doubling counts.
 *
 *   NEXT_PUBLIC_MIXPANEL_TOKEN=… yarn workspace @sorrel/frontend seed:mixpanel
 *
 * Reads the token/host from apps/web/.env when not already in the environment.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { FunnelEvent } from "@sorrel/analytics";
import { FUNNEL_STEPS } from "@sorrel/shared";

import { RETENTION, type SeedVariant as Variant } from "../lib/seed-retention";

const SESSIONS_PER_VARIANT = 300;
const DAYS = 5; // /track rejects events >5 days old; spread across the window under that
const BATCH = 50; // Mixpanel /track batch limit

// ── Env ──────────────────────────────────────────────────────────────────────
const scriptDir = dirname(fileURLToPath(import.meta.url));
function loadEnv(): Record<string, string> {
  if (process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) return process.env as Record<string, string>;
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
const TOKEN = env.NEXT_PUBLIC_MIXPANEL_TOKEN;
const HOST = (env.NEXT_PUBLIC_MIXPANEL_HOST || "https://api-eu.mixpanel.com").replace(/\/$/, "");
if (!TOKEN) {
  console.error("[seed:mixpanel] NEXT_PUBLIC_MIXPANEL_TOKEN is required");
  process.exit(1);
}

// ── Payload buffer ─────────────────────────────────────────────────────────
interface MixpanelEvent {
  event: string;
  properties: Record<string, unknown>;
}
const queue: MixpanelEvent[] = [];

/** Enqueue a typed FunnelEvent as a Mixpanel event with transport metadata. */
function send(event: FunnelEvent, distinctId: string, timeSec: number, insertId: string) {
  const { name, ...props } = event;
  queue.push({
    event: name,
    properties: {
      token: TOKEN,
      distinct_id: distinctId,
      time: timeSec,
      $insert_id: insertId,
      seed: true,
      ...props,
    },
  });
}

const NOW = Math.floor(Date.now() / 1000);

/** One session: views 0..furthest, completes 0..furthest-1; abandons or converts.
 *  Variant A drops a little more at PROFILE; pills emit no per-field error (spec 022 —
 *  the signal is the disabled-Continue gate, not a field_error). */
function emitSession(variant: Variant, furthest: number, index: number) {
  const distinctId = `seed_${variant}_${index}`;
  // Deterministic backdating: a day bucket + an hour within the day.
  const start = NOW - (index % DAYS) * 86400 - (index % 11) * 3600 - 600;
  let seq = 0;
  const at = () => start + seq * 30;
  const id = () => `${distinctId}:${seq}`;

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
    // A fraction of abandoners see the exit-intent recovery modal; some stay.
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

/** POST one batch with retry — Mixpanel returns a transient `status:0` under load.
 *  `$insert_id` makes retries (and full re-runs) idempotent. */
async function postBatch(batch: MixpanelEvent[], offset: number) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const res = await fetch(`${HOST}/track?ip=0&verbose=1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });
    const body = (await res.json().catch(() => ({}))) as { status?: number; error?: string | null };
    if (res.ok && body.status === 1) return;
    if (attempt === 5) {
      console.error(
        `[seed:mixpanel] batch @${offset} failed after ${attempt} tries:`,
        res.status,
        body,
      );
      process.exit(1);
    }
    await sleep(attempt * 500); // linear backoff
  }
}

async function flush() {
  let ok = 0;
  for (let i = 0; i < queue.length; i += BATCH) {
    const batch = queue.slice(i, i + BATCH);
    await postBatch(batch, i);
    ok += batch.length;
    await sleep(80); // gentle pacing to avoid transient ingestion failures
  }
  return ok;
}

async function main() {
  const summary = { A: buildVariant("A"), B: buildVariant("B") };
  const sent = await flush();
  console.warn(
    `[seed:mixpanel] ingested ${sent} events to ${HOST} — ` +
      `A ${summary.A.converted}/${summary.A.started}, B ${summary.B.converted}/${summary.B.started}`,
  );
}

void main();
