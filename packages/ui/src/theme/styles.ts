import { useEffect } from "react";

/**
 * Styles that inline React styles cannot express: the :focus-visible ring, the
 * three-state enter/exit animations, and the prefers-reduced-motion fallback.
 * Injected once into <head>. Colours come from CSS variables set per-instance so
 * the same rules serve both brand skins.
 */
export const DELIVERY_STYLE_ID = "sorrel-delivery-picker-styles";

export const DELIVERY_PICKER_CSS = `
@keyframes sdp-modal-in {
  from { opacity: 0; transform: translateY(-50%) scale(0.96); }
  to   { opacity: 1; transform: translateY(-50%) scale(1); }
}
@keyframes sdp-modal-out {
  from { opacity: 1; transform: translateY(-50%) scale(1); }
  to   { opacity: 0; transform: translateY(-50%) scale(0.96); }
}
@keyframes sdp-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes sdp-fade-out { from { opacity: 1; } to { opacity: 0; } }

.sdp-backdrop { animation: sdp-fade-in 180ms ease-out; }
.sdp-backdrop[data-state="closing"] { animation: sdp-fade-out 180ms ease-in; }

.sdp-modal { animation: sdp-modal-in 180ms ease-out; }
.sdp-modal[data-state="closing"] { animation: sdp-modal-out 180ms ease-in; }

.sdp-cell:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--sdp-surface), 0 0 0 5px var(--sdp-accent);
}

/*
 * Pointer feedback for deliverable cells. DayCell sets background/border/color
 * inline, so these states paint with an inset outline (a rendered "border swap")
 * derived from --sdp-accent rather than a background or border the inline style
 * would win against. outline — not box-shadow — keeps the :focus-visible ring
 * above intact. Blocked cells carry aria-disabled="true" and are excluded; the
 * selected cell's inline background: theme.accent is untouched.
 */
.sdp-cell:not([aria-disabled="true"]):hover {
  outline: 2px solid color-mix(in srgb, var(--sdp-accent) 45%, transparent);
  outline-offset: -2px;
}
.sdp-cell:not([aria-disabled="true"]):active {
  outline: 2px solid var(--sdp-accent);
  outline-offset: -2px;
  transform: translateY(1px);
}

@media (prefers-reduced-motion: reduce) {
  .sdp-backdrop { animation: sdp-fade-in 1ms ease-out; }
  .sdp-backdrop[data-state="closing"] { animation: sdp-fade-out 1ms ease-in; }
  .sdp-modal { animation: sdp-fade-in 1ms ease-out; }
  .sdp-modal[data-state="closing"] { animation: sdp-fade-out 1ms ease-in; }
}
`;

export function useInjectDeliveryStyles(): void {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(DELIVERY_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = DELIVERY_STYLE_ID;
    style.textContent = DELIVERY_PICKER_CSS;
    document.head.appendChild(style);
  }, []);
}
