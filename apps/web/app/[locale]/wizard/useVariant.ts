"use client";

import { useEffect, useState } from "react";

import { getPostHog } from "./posthog";

/**
 * The A/B bucket for the PROFILE-input experiment (spec 014) — the 39→65 lever.
 * Variant A = free-text inputs (control); B = autocomplete with defaults (test).
 *
 * Source of truth: the PostHog feature flag `profile-input` when keyed, so the
 * split is managed and the lift is analysed in PostHog (the reason PostHog was
 * chosen over GrowthBook). Offline (no key), a deterministic per-session local
 * bucket keeps the demo splittable. Resolves async — PostHog evaluates flags after
 * init — so it starts null and settles to a variant.
 */
export type Variant = "A" | "B";

const FLAG = "profile-input";
const SESSION_KEY = "sorrel.variant";

declare global {
  interface Window {
    /** Spec 032 — Cypress forces a variant for the happy-path test. Dev-only. */
    __sorrelVariant?: Variant;
  }
}

function readDevOverride(): Variant | null {
  if (process.env.NODE_ENV === "production") return null;
  if (typeof window === "undefined") return null;
  return window.__sorrelVariant ?? null;
}

function localBucket(): Variant {
  const stored = window.sessionStorage.getItem(SESSION_KEY);
  if (stored === "A" || stored === "B") return stored;
  const assigned: Variant = Math.random() < 0.5 ? "A" : "B";
  window.sessionStorage.setItem(SESSION_KEY, assigned);
  return assigned;
}

function mapFlag(value: string | boolean | undefined): Variant | null {
  if (value === "B" || value === "test") return "B";
  if (value === "A" || value === "control") return "A";
  return null;
}

export function useVariant(): Variant | null {
  const [variant, setVariant] = useState<Variant | null>(null);

  useEffect(() => {
    let active = true;

    // Spec 032 dev hook: a Cypress-set window override wins over PostHog so
    // the happy-path test pins variant A deterministically. Stripped in prod.
    // The resolution is deferred to a microtask to match the existing async
    // settle pattern below (React 19's set-state-in-effect rule wants it).
    const override = readDevOverride();
    if (override) {
      void Promise.resolve().then(() => {
        if (active) setVariant(override);
      });
      return () => {
        active = false;
      };
    }

    void getPostHog().then((posthog) => {
      if (!active) return;
      if (!posthog) {
        setVariant(localBucket()); // offline fallback (no PostHog key)
        return;
      }
      // PostHog evaluates flags asynchronously after init; settle when they arrive.
      posthog.onFeatureFlags(() => {
        if (active) setVariant(mapFlag(posthog.getFeatureFlag(FLAG)) ?? localBucket());
      });
    });
    return () => {
      active = false;
    };
  }, []);

  return variant;
}
