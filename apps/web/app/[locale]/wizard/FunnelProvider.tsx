"use client";

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import type { Track } from "@sorrel/analytics";
import { type FunnelStep } from "@sorrel/shared";

import { usePathname } from "../../../i18n/navigation";
import { createAppTracker } from "./analytics";
import {
  type FunnelAction,
  type FunnelState,
  funnelReducer,
  initialFunnelState,
  stepFromSegment,
} from "./state";
import { useDraftAutosave } from "./useDraftAutosave";
import { type Variant, useVariant } from "./useVariant";

const STORAGE_KEY = "sorrel.funnel.v1";

interface FunnelContextValue {
  state: FunnelState;
  dispatch: (action: FunnelAction) => void;
  /** Typed funnel-event emit (spec 009). No-op until the client tracker is built. */
  track: Track;
  /** Current step derived from the URL, or null off a known step. */
  currentStep: FunnelStep | null;
  /** The A/B bucket for this session (spec 014); null until resolved on the client. */
  variant: Variant | null;
  /** Server draft id once the autosave has persisted one (spec 013); null until then. */
  draftId: string | null;
  /** Funnel completed — the SUMMARY confirm was pressed (spec 017). */
  confirmed: boolean;
  /** Mark the funnel confirmed (drives the SUMMARY success state). */
  confirm: () => void;
}

const FunnelContext = createContext<FunnelContextValue | null>(null);

export function FunnelProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(funnelReducer, initialFunnelState);

  // Build the tracker lazily on the client only — the PostHog sink touches
  // window, so it must never construct during SSR.
  const trackerRef = useRef<Track | null>(null);
  const track = useCallback<Track>((event) => {
    if (typeof window === "undefined") return;
    if (!trackerRef.current) trackerRef.current = createAppTracker();
    trackerRef.current(event);
  }, []);

  // The A/B bucket, sourced from PostHog's feature flag (or the offline fallback).
  // Resolves async, so it is read via a ref at event-fire time — a late variant
  // update must not re-fire funnel_step_viewed.
  const variant = useVariant();
  const variantRef = useRef<Variant | null>(variant);
  useEffect(() => {
    variantRef.current = variant;
  }, [variant]);

  const pathname = usePathname();
  const currentStep = stepFromSegment(pathname?.split("/")[2] ?? "");

  // Server-backed autosave (spec 013): persists the draft and hands back its id.
  const draftId = useDraftAutosave(state, currentStep);

  // Funnel completion (spec 017): set by the SUMMARY-step confirm.
  const [confirmed, setConfirmed] = useState(false);
  const confirm = useCallback(() => setConfirmed(true), []);

  // Resume: hydrate once from localStorage, then persist on every change.
  const hydratedRef = useRef(false);
  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        dispatch({ type: "HYDRATE", state: JSON.parse(raw) as FunnelState });
      } catch {
        // Corrupt draft — ignore and start fresh.
      }
    }
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Record progress and fire the view event when the step changes.
  //
  // Spec 043 §3: PostHog's onFeatureFlags resolves async, so on the very first
  // step (CATS) variantRef.current is often null at emit time, which would land
  // an un-attributed third cohort in PostHog's variant-broken-down funnel. Hold
  // the first emit up to 750ms for variant to resolve; emit immediately if
  // already resolved; on timeout, fail-open with `variant: undefined` so a
  // PostHog-down browser still produces the event.
  //
  // A Set (not a single value) ensures a step that was already emitted never
  // re-fires even if the user navigates back to it — e.g. the post-payment
  // CHECKOUT → SUMMARY redirect must not produce a second SUMMARY event.
  const emittedStepsRef = useRef<Set<FunnelStep>>(new Set());
  useEffect(() => {
    if (!currentStep) return;
    dispatch({ type: "ADVANCE", step: currentStep });
    if (emittedStepsRef.current.has(currentStep)) return;

    if (variantRef.current) {
      emittedStepsRef.current.add(currentStep);
      track({
        name: "funnel_step_viewed",
        step: currentStep,
        variant: variantRef.current,
      });
      return;
    }

    const stepAtSchedule = currentStep;
    const timeout = setTimeout(() => {
      if (emittedStepsRef.current.has(stepAtSchedule)) return;
      emittedStepsRef.current.add(stepAtSchedule);
      track({
        name: "funnel_step_viewed",
        step: stepAtSchedule,
        variant: variantRef.current ?? undefined,
      });
    }, 750);
    return () => clearTimeout(timeout);
  }, [currentStep, track]);

  // Companion effect: when variant resolves, emit immediately for the current
  // step if the timeout-defer above hasn't already fired. Either path adds to
  // `emittedStepsRef`, so the other no-ops on the race.
  useEffect(() => {
    if (!variant || !currentStep) return;
    if (emittedStepsRef.current.has(currentStep)) return;
    emittedStepsRef.current.add(currentStep);
    track({
      name: "funnel_step_viewed",
      step: currentStep,
      variant,
    });
  }, [variant, currentStep, track]);

  // Abandonment: leaving the tab/page before SUMMARY is a drop-off.
  useEffect(() => {
    function onPageHide() {
      if (currentStep && currentStep !== "SUMMARY") {
        track({
          name: "funnel_abandoned",
          step: currentStep,
          variant: variantRef.current ?? undefined,
        });
      }
    }
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [currentStep, track]);

  const value = useMemo<FunnelContextValue>(
    () => ({ state, dispatch, track, currentStep, variant, draftId, confirmed, confirm }),
    [state, track, currentStep, variant, draftId, confirmed, confirm],
  );

  return <FunnelContext.Provider value={value}>{children}</FunnelContext.Provider>;
}

export function useFunnel(): FunnelContextValue {
  const ctx = useContext(FunnelContext);
  if (!ctx) throw new Error("useFunnel must be used within a FunnelProvider");
  return ctx;
}
