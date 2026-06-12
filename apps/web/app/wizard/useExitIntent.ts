"use client";

import { useEffect, useRef } from "react";

const SESSION_KEY = "sorrel.exitIntent.shown";

interface UseExitIntentOptions {
  /** When false, the trigger is disarmed (e.g. on the SUMMARY step). */
  armed: boolean;
  /** Fired once when the cursor leaves toward the browser chrome. */
  onTrigger: () => void;
}

/**
 * Desktop exit-intent trigger (spec 010): the cursor leaving the viewport upward
 * (`clientY <= 0`) toward the tabs/address bar. Fires at most once per session.
 * Touch devices have no `mouseleave`, so this deliberately does not fire there —
 * mobile drop-off stays covered by `funnel_abandoned` on pagehide.
 */
export function useExitIntent({ armed, onTrigger }: UseExitIntentOptions): void {
  const onTriggerRef = useRef(onTrigger);
  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  useEffect(() => {
    if (!armed) return;
    if (window.sessionStorage.getItem(SESSION_KEY)) return;

    function handle(event: MouseEvent) {
      if (event.clientY > 0) return;
      window.sessionStorage.setItem(SESSION_KEY, "1");
      document.removeEventListener("mouseleave", handle);
      onTriggerRef.current();
    }

    document.addEventListener("mouseleave", handle);
    return () => document.removeEventListener("mouseleave", handle);
  }, [armed]);
}
