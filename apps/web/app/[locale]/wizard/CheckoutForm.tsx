"use client";

import { useEffect, useState } from "react";

import { useQuery } from "@apollo/client/react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { Stripe, StripeElementsOptions } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";
import { useLocale, useTranslations } from "next-intl";

import {
  AppAlert,
  AppButton,
  AppCard,
  AppHeading,
  AppSkeleton,
  AppStack,
  AppText,
} from "@sorrel/ui";

import { useRouter } from "../../../i18n/navigation";
import { FunnelDraftByIdDocument } from "../../../lib/graphql/funnel";
import { useFunnel } from "./FunnelProvider";
import { toBoxFrequency, weightToKg } from "./draft-input";

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
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!PUBLISHABLE_KEY) return Promise.resolve(null);
  if (!stripePromise) stripePromise = loadStripe(PUBLISHABLE_KEY);
  return stripePromise;
}

type CheckoutPhase = "idle" | "pending" | "succeeded";

function PaymentBody() {
  const t = useTranslations("Checkout");
  const locale = useLocale();
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { track, confirm, variant } = useFunnel();
  // Spec 045: a three-phase machine instead of a `pending` boolean. Adds a
  // `succeeded` state that holds the in-card receipt feedback between Stripe's
  // resolve and the SUMMARY navigation, so the user never sees the
  // "post-success, pre-redirect" zero-feedback flash.
  const [phase, setPhase] = useState<CheckoutPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setPhase("pending");
    setErrorMessage(null);
    // Stripe appends `payment_intent` + `payment_intent_client_secret` query
    // params to `return_url` verbatim — locale stays in the app's control,
    // so we thread the active next-intl locale instead of the hardcoded `/en/`.
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/${locale}/wizard/summary?paid=1`,
      },
      redirect: "if_required",
    });
    if (result.error) {
      setPhase("idle");
      track({
        name: "payment_failed",
        step: "CHECKOUT",
        intent_id: null,
        code: result.error.code ?? "unknown",
        variant: variant ?? undefined,
      });
      setErrorMessage(result.error.message ?? t("error.unknown"));
      return;
    }
    if (result.paymentIntent && result.paymentIntent.status === "succeeded") {
      setPhase("succeeded");
      track({
        name: "payment_succeeded",
        step: "CHECKOUT",
        intent_id: result.paymentIntent.id,
        variant: variant ?? undefined,
      });
      confirm();
      // Non-3DS happy path: Stripe doesn't redirect, so we navigate explicitly
      // to the same URL the 3DS return_url targets. The locale-aware router
      // prepends `/${locale}`. SUMMARY's existing `confirmed` branch renders
      // the success card.
      router.push("/wizard/summary?paid=1");
    }
  }

  if (phase === "succeeded") {
    return (
      <AppStack
        role="status"
        aria-live="polite"
        alignItems="center"
        textAlign="center"
        gap={1.5}
        py={4}
      >
        <AppText component="span" color="primary.main">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </AppText>
        <AppHeading level={3} fontSize="1.25rem">
          {t("success")}
        </AppHeading>
      </AppStack>
    );
  }

  const pending = phase === "pending";
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
          <AppAlert severity="error" aria-live="assertive">
            {errorMessage}
          </AppAlert>
        ) : null}
      </AppStack>
    </form>
  );
}

export function CheckoutForm() {
  const t = useTranslations("Checkout");
  const { draftId, track, variant, state } = useFunnel();
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
    if (configError) return;
    if (!draftId || amountMinor === null) return;
    if (clientSecret) return;
    let cancelled = false;
    // The route calls computePlan(@sorrel/domain) server-side using these
    // inputs — the client cannot supply a price, only the inputs that
    // determine it. No self-referential GraphQL fetch needed (works on Vercel).
    const frequency = toBoxFrequency(state.frequency);
    const cats = state.cats.map((c) => ({ weightKg: weightToKg(c.weight) }));
    void fetch("/api/checkout/intent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        draftId,
        cats,
        frequency,
        recipeSlugs: state.recipeSlugs,
        email: state.email,
        deliveryDate: state.deliveryDate,
      }),
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
          variant: variant ?? undefined,
        });
      })
      .catch(() => {
        if (!cancelled) setFetchError(t("error.boot"));
      });
    return () => {
      cancelled = true;
    };
  }, [draftId, amountMinor, currency, clientSecret, configError, track, t, variant, state]);

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

  const email = state.email ?? undefined;
  const options: StripeElementsOptions = {
    clientSecret,
    appearance: { theme: "stripe" },
    ...(email ? { defaultValues: { billingDetails: { email } } } : {}),
  };

  return (
    <AppCard tone="paper">
      <Elements stripe={getStripe()} options={options}>
        <PaymentBody />
      </Elements>
    </AppCard>
  );
}
