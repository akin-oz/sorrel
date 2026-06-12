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
} from "react";

import { usePathname } from "next/navigation";

import type { Track } from "@sorrel/analytics";
import { type FunnelStep } from "@sorrel/shared";

import { createAppTracker } from "./analytics";
import {
  type FunnelAction,
  type FunnelState,
  funnelReducer,
  initialFunnelState,
  stepFromSegment,
} from "./state";

const STORAGE_KEY = "sorrel.funnel.v1";

interface FunnelContextValue {
  state: FunnelState;
  dispatch: (action: FunnelAction) => void;
  /** Typed funnel-event emit (spec 009). No-op until the client tracker is built. */
  track: Track;
  /** Current step derived from the URL, or null off a known step. */
  currentStep: FunnelStep | null;
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

  const pathname = usePathname();
  const currentStep = stepFromSegment(pathname?.split("/")[2] ?? "");

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
  useEffect(() => {
    if (!currentStep) return;
    dispatch({ type: "ADVANCE", step: currentStep });
    track({ name: "funnel_step_viewed", step: currentStep });
  }, [currentStep, track]);

  // Abandonment: leaving the tab/page before SUMMARY is a drop-off.
  useEffect(() => {
    function onPageHide() {
      if (currentStep && currentStep !== "SUMMARY") {
        track({ name: "funnel_abandoned", step: currentStep });
      }
    }
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [currentStep, track]);

  const value = useMemo<FunnelContextValue>(
    () => ({ state, dispatch, track, currentStep }),
    [state, track, currentStep],
  );

  return <FunnelContext.Provider value={value}>{children}</FunnelContext.Provider>;
}

export function useFunnel(): FunnelContextValue {
  const ctx = useContext(FunnelContext);
  if (!ctx) throw new Error("useFunnel must be used within a FunnelProvider");
  return ctx;
}
