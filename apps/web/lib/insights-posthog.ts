/**
 * Live funnel read for /insights (spec 023). Server-only: it reads the server-only
 * `POSTHOG_PERSONAL_API_KEY` (never `NEXT_PUBLIC_*`, never imported by a client
 * component). Queries PostHog's REST Query API for the 7-step `funnel_step_viewed`
 * funnel broken down by `variant`, and maps the result into the exact shape the page
 * already renders from `insights-data.json`. Returns `null` on any failure so the
 * caller falls back to the static JSON — no throw, no ghost UI. Plain `fetch`; no SDK.
 */
import { FUNNEL_STEPS } from "@sorrel/shared";

export interface InsightsVariant {
  viewed: number[];
  completionRate: number;
}
export interface InsightsData {
  sessionsPerVariant: number;
  steps: string[];
  variants: { A: InsightsVariant; B: InsightsVariant };
}

const HOST = (process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com").replace(
  /\/$/,
  "",
);
const REVALIDATE_SECONDS = 3600;

/** One funnel step = a `funnel_step_viewed` filtered to that step value. */
function funnelQuery(organicOnly: boolean) {
  const series = FUNNEL_STEPS.map((step) => ({
    kind: "EventsNode",
    event: "funnel_step_viewed",
    properties: [{ key: "step", type: "event", value: [step], operator: "exact" }],
  }));
  const query: Record<string, unknown> = {
    kind: "FunnelsQuery",
    series,
    breakdownFilter: { breakdown_type: "event", breakdown: "variant" },
    dateRange: { date_from: "-90d" },
    funnelsFilter: { funnelOrderType: "ordered" },
  };
  // Optional: organic-only (exclude seeded synthetic sessions).
  if (organicOnly) {
    query.properties = [{ key: "seed", type: "event", value: ["true"], operator: "is_not" }];
  }
  return query;
}

function variantKey(value: unknown): "A" | "B" | null {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "A" || v === "B" ? v : null;
}

/** Map a breakdown FunnelsQuery response into the page's `{ variants }` shape. */
function mapResponse(json: unknown): InsightsData | null {
  const results = (json as { results?: unknown })?.results;
  if (!Array.isArray(results) || results.length === 0) return null;

  const variants: Partial<Record<"A" | "B", InsightsVariant>> = {};
  for (const group of results) {
    if (!Array.isArray(group) || group.length === 0) continue;
    const key = variantKey((group[0] as { breakdown_value?: unknown }).breakdown_value);
    if (!key) continue;
    const viewed = group.map((step) => Number((step as { count?: number }).count ?? 0));
    if (!viewed[0]) continue; // empty arm — treat as a miss
    variants[key] = {
      viewed,
      completionRate: Number((viewed[viewed.length - 1] / viewed[0]).toFixed(4)),
    };
  }
  if (!variants.A || !variants.B) return null;

  return {
    sessionsPerVariant: Math.max(variants.A.viewed[0], variants.B.viewed[0]),
    steps: [...FUNNEL_STEPS],
    variants: { A: variants.A, B: variants.B },
  };
}

/**
 * Fetch the live variant-split funnel from PostHog. Returns `null` when the server
 * key/project is absent, the request fails, the body is unparseable, or no rows come
 * back — so `/insights` can fall back to the static JSON deterministically.
 */
export async function fetchLiveInsights(
  opts: { organicOnly?: boolean } = {},
): Promise<InsightsData | null> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  if (!key || !projectId) return null;

  try {
    const res = await fetch(`${HOST}/api/projects/${projectId}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query: funnelQuery(opts.organicOnly ?? false) }),
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return mapResponse(await res.json());
  } catch {
    return null;
  }
}
