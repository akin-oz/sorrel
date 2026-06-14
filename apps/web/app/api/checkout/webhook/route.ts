import { NextResponse } from "next/server";
import Stripe from "stripe";

/**
 * Spec 039 — POST /api/checkout/webhook
 *
 * Stripe webhook endpoint. HMAC-verifies the `Stripe-Signature` header against
 * `STRIPE_WEBHOOK_SECRET` and accepts the two terminal events the funnel
 * cares about:
 *
 *   - `payment_intent.succeeded` — the bank's word.
 *   - `payment_intent.payment_failed` — the bank's no.
 *
 * On unverified signature the endpoint returns 400 (Stripe will retry — the
 * spec stops there for production hardening; idempotency rides a follow-on).
 */

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2026-05-27.dahlia" });
}

export async function POST(request: Request): Promise<Response> {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded":
    case "payment_intent.payment_failed":
      // First-pass log only — telemetry sinks are client-side via the spec-009
      // typed contract. A future spec wires server-side capture.
      console.warn(`[stripe.webhook] ${event.type} ${event.data.object.id}`);
      break;
    default:
      // Ignore everything else — the funnel only cares about the terminal pair.
      break;
  }

  return NextResponse.json({ received: true });
}
