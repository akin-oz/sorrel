import { NextResponse } from "next/server";
import Stripe from "stripe";

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
 * The request body is now `{ draftId }` only. The server fetches the canonical
 * price via the GraphQL contract (`FunnelDraft.plan.pricing.firstBox`, which is
 * computed by `@sorrel/domain` per the source-of-truth rule — money math NEVER
 * lives in apps/web). The client-supplied amount that the first cut accepted is
 * gone. The PaymentIntent gets an Idempotency-Key keyed on the draft id so a
 * React StrictMode double-fetch or a retry returns the same intent.
 *
 * `STRIPE_SECRET_KEY` is server-only — never `NEXT_PUBLIC_*`. The acceptance
 * criterion grep against the prod build proves it.
 */

interface IntentRequest {
  draftId: string;
}

interface DraftLookupResponse {
  data?: {
    funnelDraft: {
      email: string | null;
      recipeSlugs: ReadonlyArray<string>;
      deliveryDate: string | null;
      plan: { pricing: { firstBox: { amountMinor: number; currency: string } } } | null;
    } | null;
  };
}

interface DraftLookup {
  amountMinor: number;
  currency: string;
  email: string | null;
  recipeSlugs: ReadonlyArray<string>;
  deliveryDate: string | null;
}

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  // Pin the request API version explicitly (Stripe best-practice). The literal
  // is the value of `Stripe.LatestApiVersion` in the installed SDK; bumping
  // the SDK is the only way to bump this string, which is the intended gate.
  return new Stripe(key, { apiVersion: "2026-05-27.dahlia" });
}

const FUNNEL_DRAFT_LOOKUP_QUERY = `
  query FunnelDraftLookup($id: ID!) {
    funnelDraft(id: $id) {
      email
      recipeSlugs
      deliveryDate
      plan {
        pricing {
          firstBox {
            amountMinor
            currency
          }
        }
      }
    }
  }
`;

async function readDraft(origin: string, draftId: string): Promise<DraftLookup | null> {
  const response = await fetch(new URL("/api/graphql", origin).toString(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: FUNNEL_DRAFT_LOOKUP_QUERY, variables: { id: draftId } }),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as DraftLookupResponse;
  const draft = payload.data?.funnelDraft;
  const firstBox = draft?.plan?.pricing.firstBox;
  if (!draft || !firstBox) return null;
  return {
    amountMinor: firstBox.amountMinor,
    currency: firstBox.currency,
    email: draft.email,
    recipeSlugs: draft.recipeSlugs,
    deliveryDate: draft.deliveryDate,
  };
}

/**
 * Stripe metadata is `Record<string, string>` — null/empty fields would either
 * fail validation or get stored as the literal string "null". We omit them so
 * the dashboard view stays honest about what was known at intent time.
 */
function buildMetadata(draftId: string, draft: DraftLookup): Record<string, string> {
  const metadata: Record<string, string> = { draft_id: draftId };
  if (draft.email) metadata.email = draft.email;
  if (draft.recipeSlugs.length > 0) metadata.recipe_slugs = draft.recipeSlugs.join(",");
  if (draft.deliveryDate) metadata.delivery_date = draft.deliveryDate;
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
  const draft = await readDraft(new URL(request.url).origin, body.draftId);
  if (!draft) {
    return NextResponse.json({ error: "draft_not_found_or_unpriced" }, { status: 404 });
  }
  // The PaymentIntent's own status-based dedup is strong, but the docs still
  // recommend an Idempotency-Key on create — it prevents StrictMode /
  // network-retry double-creates against the same draft.
  const intent = await stripe.paymentIntents.create(
    {
      amount: draft.amountMinor,
      currency: draft.currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: buildMetadata(body.draftId, draft),
    },
    { idempotencyKey: `pi-${body.draftId}` },
  );
  return NextResponse.json({
    clientSecret: intent.client_secret,
    intentId: intent.id,
  });
}
