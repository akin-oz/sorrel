import { NextResponse } from "next/server";
import Stripe from "stripe";

import { computePlan } from "@sorrel/domain";
import type { BoxFrequency } from "@sorrel/domain";

/**
 * Spec 039 — POST /api/checkout/intent
 *
 * Server-side recompute pattern per the Stripe MCP `stripe_implementation_planner`
 * findings (audit on top of spec 039's first cut):
 *
 *   "Always decide how much to charge on the server side, a trusted environment,
 *    as opposed to the client. This prevents malicious customers from being able
 *    to choose their own prices." — docs.stripe.com/payments/payment-intents
 *
 * The request body is `{ draftId, cats, frequency, recipeSlugs, email, deliveryDate }`.
 * The server calls computePlan() from @sorrel/domain to get the authoritative price —
 * no self-referential HTTP fetch, no in-memory Map dependency. This makes the route
 * work correctly on Vercel, where each serverless function invocation has isolated
 * module-level state.
 *
 * `STRIPE_SECRET_KEY` is server-only — never `NEXT_PUBLIC_*`. The acceptance
 * criterion grep against the prod build proves it.
 */

interface CatPayload {
  weightKg: number;
}

interface IntentRequest {
  draftId: string;
  cats: CatPayload[];
  frequency: string;
  recipeSlugs?: string[];
  email?: string | null;
  deliveryDate?: string | null;
}

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  // Pin the request API version explicitly (Stripe best-practice). The literal
  // is the value of `Stripe.LatestApiVersion` in the installed SDK; bumping
  // the SDK is the only way to bump this string, which is the intended gate.
  return new Stripe(key, { apiVersion: "2026-05-27.dahlia" });
}

const VALID_FREQUENCIES: ReadonlySet<string> = new Set(["EVERY_2_WEEKS", "EVERY_4_WEEKS"]);

/**
 * Stripe metadata is `Record<string, string>` — null/empty fields would either
 * fail validation or get stored as the literal string "null". We omit them so
 * the dashboard view stays honest about what was known at intent time.
 */
function buildMetadata(body: IntentRequest): Record<string, string> {
  const metadata: Record<string, string> = { draft_id: body.draftId };
  if (body.email) metadata.email = body.email;
  if (body.recipeSlugs && body.recipeSlugs.length > 0)
    metadata.recipe_slugs = body.recipeSlugs.join(",");
  if (body.deliveryDate) metadata.delivery_date = body.deliveryDate;
  return metadata;
}

export async function POST(request: Request): Promise<Response> {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }
  const body = (await request.json()) as IntentRequest;
  if (!body.draftId || typeof body.draftId !== "string") {
    return NextResponse.json({ error: "invalid_draft_id" }, { status: 400 });
  }
  if (!Array.isArray(body.cats) || body.cats.length === 0) {
    return NextResponse.json({ error: "invalid_cats" }, { status: 400 });
  }
  if (!body.frequency || !VALID_FREQUENCIES.has(body.frequency)) {
    return NextResponse.json({ error: "invalid_frequency" }, { status: 400 });
  }

  // Server-side price computation via @sorrel/domain (source-of-truth rule).
  // The client sends plan inputs; the server derives the authoritative amount.
  // The client cannot supply a price — only the inputs that determine it.
  const plan = computePlan({
    cats: body.cats.map((c) => ({ weightKg: c.weightKg })),
    frequency: body.frequency as BoxFrequency,
  });
  const { amountMinor, currency } = plan.pricing.firstBox;

  // The PaymentIntent's own status-based dedup is strong, but the docs still
  // recommend an Idempotency-Key on create — it prevents StrictMode /
  // network-retry double-creates against the same draft.
  const intent = await stripe.paymentIntents.create(
    {
      amount: amountMinor,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: buildMetadata(body),
    },
    { idempotencyKey: `pi-${body.draftId}` },
  );
  return NextResponse.json({
    clientSecret: intent.client_secret,
    intentId: intent.id,
  });
}
