/**
 * The transport seam (spec 009): one typed contract, swappable destinations.
 *
 * `createTracker` binds the typed event union to a sink. Web wires a real
 * provider sink (PostHog, spec 010); seed scripts and tests wire `memorySink`.
 * The contract does not bind to any vendor — the events don't know where they go.
 */
import type { FunnelEvent } from "./events";

export interface AnalyticsSink {
  emit(event: FunnelEvent): void;
}

/** A typed emit: callers can only pass a valid `FunnelEvent`. */
export type Track = (event: FunnelEvent) => void;

export function createTracker(sink: AnalyticsSink): Track {
  return (event) => sink.emit(event);
}

/** Dev default: logs each event. Uses `console.warn` (the lint-allowed channel). */
export const consoleSink: AnalyticsSink = {
  emit(event) {
    console.warn(`[analytics] ${event.name}`, event);
  },
};

export interface MemorySink extends AnalyticsSink {
  /** Events captured so far, in emit order. */
  readonly events: readonly FunnelEvent[];
  /** Reset between tests. */
  clear(): void;
}

/** Test / seed-script sink: captures emitted events into a readable array. */
export function createMemorySink(): MemorySink {
  const events: FunnelEvent[] = [];
  return {
    events,
    emit(event) {
      events.push(event);
    },
    clear() {
      events.length = 0;
    },
  };
}
