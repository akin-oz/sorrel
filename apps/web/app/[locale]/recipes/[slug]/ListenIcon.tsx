/**
 * Spec 055 — per-state icon for the Listen button. Authored inline SVG (one 2px
 * stroke family, `currentColor`), matching the other inline icons in the app.
 *
 * Playing shows three equaliser bars. Hovering or focusing the button settles
 * them into a pause glyph (outer bars slide in, middle bar fades), so the live
 * indicator also shows what a click will do. Reduced motion keeps every shape
 * static.
 */
export type ListenStatus = "idle" | "loading" | "playing" | "paused" | "error";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/** Scoped CSS — `<style href precedence>` lets React 19 hoist and dedupe it. */
export const LISTEN_STYLES = `
.sorrel-listen__labels { display: grid; justify-items: start; }
.sorrel-listen__labels > span { grid-area: 1 / 1; visibility: hidden; }
.sorrel-listen__labels > span[data-active="true"] { visibility: visible; }

.sorrel-listen__eq rect {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  transition: transform 180ms ${EASE}, opacity 180ms ${EASE};
  animation: sorrel-listen-eq 760ms ease-in-out infinite alternate;
}
.sorrel-listen__eq rect:nth-of-type(2) { animation-duration: 620ms; animation-delay: -310ms; }
.sorrel-listen__eq rect:nth-of-type(3) { animation-duration: 840ms; animation-delay: -520ms; }
@keyframes sorrel-listen-eq { from { transform: scaleY(0.3); } to { transform: scaleY(1); } }

.sorrel-listen:hover .sorrel-listen__eq rect,
.sorrel-listen:focus-visible .sorrel-listen__eq rect { animation: none; }
.sorrel-listen:hover .sorrel-listen__eq rect:nth-of-type(1),
.sorrel-listen:focus-visible .sorrel-listen__eq rect:nth-of-type(1) { transform: translateX(2.5px); }
.sorrel-listen:hover .sorrel-listen__eq rect:nth-of-type(2),
.sorrel-listen:focus-visible .sorrel-listen__eq rect:nth-of-type(2) { opacity: 0; }
.sorrel-listen:hover .sorrel-listen__eq rect:nth-of-type(3),
.sorrel-listen:focus-visible .sorrel-listen__eq rect:nth-of-type(3) { transform: translateX(-2.5px); }

.sorrel-listen__dots circle { animation: sorrel-listen-dot 900ms ease-in-out infinite; }
.sorrel-listen__dots circle:nth-of-type(2) { animation-delay: 150ms; }
.sorrel-listen__dots circle:nth-of-type(3) { animation-delay: 300ms; }
@keyframes sorrel-listen-dot { 0%, 100% { opacity: 0.3; } 40% { opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  .sorrel-listen__eq rect, .sorrel-listen__dots circle { animation: none; transition: none; }
  .sorrel-listen__eq rect:nth-of-type(1) { transform: scaleY(0.6); }
  .sorrel-listen__eq rect:nth-of-type(3) { transform: scaleY(0.8); }
}
`;

const SVG_PROPS = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
} as const;

export function ListenIcon({ status }: { status: ListenStatus }) {
  switch (status) {
    case "idle":
      return (
        <svg {...SVG_PROPS}>
          <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
          <path d="M15.5 9a4.5 4.5 0 0 1 0 6" />
          <path d="M18.5 6.5a8 8 0 0 1 0 11" />
        </svg>
      );
    case "loading":
      return (
        <svg {...SVG_PROPS} className="sorrel-listen__dots" stroke="none" fill="currentColor">
          <circle cx="6" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="18" cy="12" r="2" />
        </svg>
      );
    case "playing":
      return (
        <svg {...SVG_PROPS} className="sorrel-listen__eq" stroke="none" fill="currentColor">
          <rect x="4.5" y="5" width="3" height="14" rx="1.5" />
          <rect x="10.5" y="5" width="3" height="14" rx="1.5" />
          <rect x="16.5" y="5" width="3" height="14" rx="1.5" />
        </svg>
      );
    case "paused":
      return (
        <svg {...SVG_PROPS}>
          <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
        </svg>
      );
    case "error":
      return (
        <svg {...SVG_PROPS}>
          <path d="M20 12a8 8 0 1 1-2.35-5.65" />
          <path d="M20 4.5v4h-4" />
        </svg>
      );
  }
}
