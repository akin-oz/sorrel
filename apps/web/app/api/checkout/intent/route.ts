import { NextResponse } from "next/server";
import Stripe from "stripe";

/**
 * Spec 039 — POST /api/checkout/intent
 *
 * Creates a Stripe PaymentIntent for the funnel's first-box price. The price
 * comes from the request body (the client computes it via the existing
 * `@sorrel/domain` plan path); the server never trusts the client number for
 * production billing (test mode acceptable here per spec scope). Returns
 * `{ clientSecret }` which the Payment Element consumes to confirm.
 *
 * `STRIPE_SECRET_KEY` is server-only — never `NEXT_PUBLIC_*`. The acceptance
 * criterion grep against the prod build proves it.
 */

interface IntentRequest {
  amount_minor: number;
  currency?: string;
  /** Funnel-state hints surfaced into Stripe metadata for dashboard search. */
  metadata?: Record<string, string>;
}

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function POST(request: Request): Promise<Response> {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }
  const body = (await request.json()) as IntentRequest;
  if (!Number.isInteger(body.amount_minor) || body.amount_minor < 50) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }
  const intent = await stripe.paymentIntents.create({
    amount: body.amount_minor,
    currency: (body.currency ?? "gbp").toLowerCase(),
    automatic_payment_methods: { enabled: true },
    metadata: body.metadata ?? {},
  });
  return NextResponse.json({
    clientSecret: intent.client_secret,
    intentId: intent.id,
  });
}
