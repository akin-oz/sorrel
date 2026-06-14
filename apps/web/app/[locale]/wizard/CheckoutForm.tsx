"use client";

import { useEffect, useState } from "react";

import { useQuery } from "@apollo/client/react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { type Stripe, type StripeElementsOptions, loadStripe } from "@stripe/stripe-js";
import { useTranslations } from "next-intl";

import { AppAlert, AppButton, AppCard, AppSkeleton, AppStack, AppText } from "@sorrel/ui";

import { FunnelDraftByIdDocument } from "../../../lib/graphql/funnel";
import { useFunnel } from "./FunnelProvider";

/**
 * CHECKOUT step (spec 039, Decision A: SUMMARY → CHECKOUT, Decision B:
 * Stripe Elements + PaymentElement). The user stays inside the Sorrel chrome;
 * the PaymentElement renders in-card.
 *
 * The publishable key is the only client-side Stripe surface. The secret key
 * lives server-only on `/api/checkout/intent`.
 */

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

let stripePromise: Promise<Stripe | null> | null = null;
function getStripe(): Promise<Stripe | null> {
  if (!PUBLISHABLE_KEY) return Promise.resolve(null);
  if (!stripePromise) stripePromise = loadStripe(PUBLISHABLE_KEY);
  return stripePromise;
}

function PaymentBody() {
  const t = useTranslations("Checkout");
  const stripe = useStripe();
  const elements = useElements();
  const { track, confirm } = useFunnel();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setPending(true);
    setErrorMessage(null);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.origin + "/en/wizard/summary?paid=1" },
      redirect: "if_required",
    });
    setPending(false);
    if (result.error) {
      track({
        name: "payment_failed",
        step: "CHECKOUT",
        intent_id: null,
        code: result.error.code ?? "unknown",
      });
      setErrorMessage(result.error.message ?? t("error.unknown"));
      return;
    }
    if (result.paymentIntent && result.paymentIntent.status === "succeeded") {
      track({
        name: "payment_succeeded",
        step: "CHECKOUT",
        intent_id: result.paymentIntent.id,
      });
      confirm();
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <AppStack gap={2}>
        <PaymentElement />
        <AppButton
          type="submit"
          variant="contained"
          size="large"
          disabled={!stripe || pending}
          fullWidth
        >
          {pending ? t("submitting") : t("submit")}
        </AppButton>
        {errorMessage ? (
          <AppAlert severity="error" aria-live="polite">
            {errorMessage}
          </AppAlert>
        ) : null}
      </AppStack>
    </form>
  );
}

export function CheckoutForm() {
  const t = useTranslations("Checkout");
  const { draftId, track } = useFunnel();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const { data } = useQuery(FunnelDraftByIdDocument, {
    variables: { id: draftId ?? "" },
    skip: !draftId,
  });
  const plan = data?.funnelDraft?.plan ?? null;
  const amountMinor = plan?.pricing.firstBox.amountMinor ?? null;
  const currency = plan?.pricing.firstBox.currency ?? "GBP";

  // Computed at render — no effect state-set needed.
  const configError = PUBLISHABLE_KEY ? null : t("error.notConfigured");

  useEffect(() => {
    if (clientSecret || configError) return;
    if (amountMinor === null) return;
    let cancelled = false;
    void fetch("/api/checkout/intent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount_minor: amountMinor, currency }),
    })
      .then((response) => {
        if (!response.ok) throw new Error(`http ${response.status}`);
        return response.json() as Promise<{ clientSecret: string }>;
      })
      .then((payload) => {
        if (cancelled) return;
        setClientSecret(payload.clientSecret);
        track({
          name: "payment_intent_created",
          step: "CHECKOUT",
          amount_minor: amountMinor,
          currency,
        });
      })
      .catch(() => {
        if (!cancelled) setFetchError(t("error.boot"));
      });
    return () => {
      cancelled = true;
    };
  }, [amountMinor, currency, clientSecret, configError, track, t]);

  const bootError = configError ?? fetchError;

  if (bootError) {
    return (
      <AppCard tone="paper">
        <AppAlert severity="warning">{bootError}</AppAlert>
      </AppCard>
    );
  }
  if (!clientSecret) {
    return (
      <AppCard tone="paper">
        <AppStack gap={2}>
          <AppText>{t("preparing")}</AppText>
          <AppSkeleton variant="rounded" height={120} />
        </AppStack>
      </AppCard>
    );
  }

  const options: StripeElementsOptions = { clientSecret, appearance: { theme: "stripe" } };

  return (
    <AppCard tone="paper">
      <Elements stripe={getStripe()} options={options}>
        <PaymentBody />
      </Elements>
    </AppCard>
  );
}
