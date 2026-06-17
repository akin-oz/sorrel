"use client";

import {
  type CSSProperties,
  type AnimationEvent as ReactAnimationEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import {
  type BlockedReason,
  type DateCell,
  type GridKey,
  type IsoDate,
  buildMonthView,
  earliestDeliverableDate,
  moveFocus,
  parseIso,
  toIso,
  toWeeks,
} from "@sorrel/domain";

import { appTokens } from "./app/tokens";
import { useInjectDeliveryStyles } from "./theme/styles";
import { type DeliveryTheme, FONT_MONO, FONT_SANS, FONT_SERIF, sorrelTheme } from "./theme/tokens";

/** Display strings + reason templates. The host (e.g. next-intl) supplies localised values. */
export interface DeliveryLabels {
  dialogTitle: string;
  cancel: string;
  confirm: string;
  change: string;
  earliestDelivery: string;
  deliveryDate: string;
  freeDelivery: string;
  blockedWeekday: (weekday: string) => string;
  beforeEarliest: (date: string) => string;
  /**
   * Live-region announcement when keyboard navigation moves the draft selection
   * onto a deliverable day (spec 025, R3). `date` is the pre-formatted long date
   * (e.g. "Wednesday 17 June"). Host-overridable; the English default below ships
   * the picker without requiring a translation change.
   */
  selectionAnnouncement: (date: string) => string;
}

export const DEFAULT_DELIVERY_LABELS: DeliveryLabels = {
  dialogTitle: "Choose a delivery day",
  cancel: "Cancel",
  confirm: "Confirm",
  change: "Change",
  earliestDelivery: "Earliest delivery",
  deliveryDate: "Delivery date",
  freeDelivery: "Free delivery",
  blockedWeekday: (weekday) => `No deliveries on ${weekday}s`,
  beforeEarliest: (date) => `Earliest delivery is ${date}`,
  selectionAnnouncement: (date) => `Delivery set to ${date}`,
};

// 2024-01-01 is a Monday — reference point for naming a Monday-first weekday index.
const MONDAY_REF_MS = Date.UTC(2024, 0, 1);
const DAY_MS = 86_400_000;

function weekdayName(mondayIndex: number, locale: string, weekday: "long" | "narrow"): string {
  return new Intl.DateTimeFormat(locale, { weekday, timeZone: "UTC" }).format(
    new Date(MONDAY_REF_MS + mondayIndex * DAY_MS),
  );
}

function formatDate(iso: IsoDate, locale: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, { ...opts, timeZone: "UTC" }).format(parseIso(iso));
}

function blockedReasonText(reason: BlockedReason, locale: string, labels: DeliveryLabels): string {
  return reason.code === "BLOCKED_WEEKDAY"
    ? labels.blockedWeekday(weekdayName(reason.weekdayIndex, locale, "long"))
    : labels.beforeEarliest(formatDate(reason.earliest, locale, { day: "numeric", month: "long" }));
}

export interface DeliveryDatePickerProps {
  /** "Today" as an ISO date; defaults to the current date. */
  today?: IsoDate;
  /** Controlled committed selection (ISO date). */
  value?: IsoDate;
  /** Uncontrolled initial selection; defaults to the earliest deliverable day. */
  defaultValue?: IsoDate;
  /** Days of lead time before the first deliverable day. */
  leadDays?: number;
  /** Brand token skin. Defaults to Sorrel. */
  theme?: DeliveryTheme;
  /** BCP-47 locale for date formatting (e.g. "en-GB", "de-DE"). Defaults to en-GB. */
  locale?: string;
  /** Localised display strings; merged over English defaults. */
  labels?: Partial<DeliveryLabels>;
  /** Called with the ISO date when the user confirms a new day. */
  onConfirm?: (iso: IsoDate) => void;
  /** Called when the modal opens (true) or closes (false). */
  onOpenChange?: (open: boolean) => void;
}

type DialogState = "closed" | "open" | "closing";

const GRID_KEYS: ReadonlySet<string> = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
]);

function getFocusable(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  // R8 (spec 025): blocked day cells carry `aria-disabled="true"` and never the
  // native `disabled` attribute (they keep DOM focusability for roving tabindex).
  // The `:not([aria-disabled="true"])` clause excludes them belt-and-braces — the
  // roving `tabIndex={-1}` is the primary guard, this makes the contract explicit.
  const nodes = root.querySelectorAll<HTMLElement>(
    'button:not([disabled]):not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"])',
  );
  return Array.from(nodes).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

// R2 (spec 025): whether the engine implements the native `inert` attribute.
// Evergreen browsers do; older Safari does not, in which case we additionally
// mark the same nodes `aria-hidden="true"` as a defensive fallback.
const SUPPORTS_INERT = typeof HTMLElement !== "undefined" && "inert" in HTMLElement.prototype;

/**
 * R2 (spec 025): neutralise everything outside the open dialog so an AT virtual
 * cursor cannot escape the modal subtree (WCAG 2.4.3 / 4.1.2).
 *
 * The picker renders the overlay inline (not portalled), so "mark every body
 * child that is not the overlay" generalises to walking each ancestor level from
 * the overlay up to `<body>` and marking every *sibling* off that path. The
 * overlay's own subtree — backdrop + dialog + live region — is never touched, so
 * backdrop-click-to-close keeps working. Host-agnostic: no page-root attribute
 * required. Returns a cleanup that restores each node's prior state exactly.
 */
function neutraliseBackground(overlay: HTMLElement): () => void {
  const touched: Array<{ el: Element; hadInert: boolean; prevAriaHidden: string | null }> = [];

  let node: Element | null = overlay;
  while (node && node !== document.body) {
    const parent: Element | null = node.parentElement;
    if (!parent) break;
    for (const sibling of Array.from(parent.children)) {
      if (sibling === node) continue;
      touched.push({
        el: sibling,
        hadInert: sibling.hasAttribute("inert"),
        prevAriaHidden: sibling.getAttribute("aria-hidden"),
      });
      sibling.setAttribute("inert", "");
      if (!SUPPORTS_INERT) sibling.setAttribute("aria-hidden", "true");
    }
    node = parent;
  }

  return () => {
    for (const { el, hadInert, prevAriaHidden } of touched) {
      if (!hadInert) el.removeAttribute("inert");
      if (!SUPPORTS_INERT) {
        if (prevAriaHidden === null) el.removeAttribute("aria-hidden");
        else el.setAttribute("aria-hidden", prevAriaHidden);
      }
    }
  };
}

export function DeliveryDatePicker({
  today: todayProp,
  value,
  defaultValue,
  leadDays,
  theme = sorrelTheme,
  locale = "en-GB",
  labels,
  onConfirm,
  onOpenChange,
}: DeliveryDatePickerProps) {
  useInjectDeliveryStyles();

  const resolvedLabels: DeliveryLabels = { ...DEFAULT_DELIVERY_LABELS, ...labels };

  // Spec 034: the fallback `today` is computed via a `useState` initializer so
  // the client-only `new Date()` call runs once per mount. For SSR-safety the
  // host (the wizard at apps/web/.../wizard/[step]/page.tsx) passes `today`
  // from a server component; non-wizard consumers (tests, storybook) hit the
  // initializer, which is non-SSR so cannot drift.
  const [fallbackToday] = useState<IsoDate>(() => toIso(new Date()));
  const today = todayProp ?? fallbackToday;
  const earliest = earliestDeliverableDate(today, leadDays);

  const isControlled = value !== undefined;
  const [internalCommitted, setInternalCommitted] = useState<IsoDate>(defaultValue ?? earliest);
  const committed = isControlled ? value : internalCommitted;

  const [state, setState] = useState<DialogState>("closed");
  const [draft, setDraft] = useState<IsoDate>(committed);
  const [activeIso, setActiveIso] = useState<IsoDate>(committed);
  const [focusTick, setFocusTick] = useState(0);
  // R3 (spec 025): live-region message for screen readers. "" is silent.
  const [announcement, setAnnouncement] = useState("");

  const changeRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<IsoDate, HTMLButtonElement>>(new Map());
  const pendingConfirm = useRef<IsoDate | null>(null);
  const hasOpened = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalized = useRef(true);

  // Safety net: if animationend never fires (reduced-motion near-zero duration, an
  // interrupted animation), the modal must not stick in "closing" forever.
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  const labelId = useId();
  const monthId = useId();

  const committedDate = parseIso(committed);
  const viewYear = committedDate.getUTCFullYear();
  const viewMonth = committedDate.getUTCMonth() + 1;
  const monthView = buildMonthView(viewYear, viewMonth, { earliest, selected: draft });

  // Focus the active cell after keyboard navigation or on open.
  useEffect(() => {
    if (state !== "open") return;
    cellRefs.current.get(activeIso)?.focus();
  }, [activeIso, focusTick, state]);

  // Return focus to the Change button once the modal has fully closed.
  useEffect(() => {
    if (state === "closed" && hasOpened.current) {
      changeRef.current?.focus();
    }
  }, [state]);

  // R2 (spec 025): mark the rest of the page inert while the dialog is OPEN. The
  // cleanup restores it on every transition out of "open" — including the exit
  // animation ("closing") and unmount-mid-closing — so AT returns to the page as
  // soon as the dialog starts dismissing.
  useEffect(() => {
    if (state !== "open") return;
    const overlay = overlayRef.current;
    if (!overlay) return;
    return neutraliseBackground(overlay);
  }, [state]);

  function open() {
    hasOpened.current = true;
    setDraft(committed);
    setActiveIso(committed);
    setAnnouncement("");
    setState("open");
    setFocusTick((n) => n + 1);
    onOpenChange?.(true);
  }

  function requestClose(commit: boolean) {
    if (commit) {
      pendingConfirm.current = draft;
      if (!isControlled) setInternalCommitted(draft);
    } else {
      pendingConfirm.current = null;
    }
    finalized.current = false;
    setState("closing");
    onOpenChange?.(false);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(finishClose, 320); // > the 180ms exit animation
  }

  // Unmount on the exit animation's end — once. Either the scoped animationend or the
  // safety-net timeout gets here first; the `finalized` ref makes it idempotent.
  function finishClose() {
    if (finalized.current) return;
    finalized.current = true;
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setState("closed");
    const confirmed = pendingConfirm.current;
    pendingConfirm.current = null;
    if (confirmed !== null) onConfirm?.(confirmed);
  }

  function handleAnimationEnd(event: ReactAnimationEvent<HTMLDivElement>) {
    // Only the modal's OWN exit animation — not a bubbled descendant animation.
    if (event.target !== event.currentTarget) return;
    finishClose();
  }

  function announceSelection(iso: IsoDate) {
    setAnnouncement(
      resolvedLabels.selectionAnnouncement(
        formatDate(iso, locale, { weekday: "long", day: "numeric", month: "long" }),
      ),
    );
  }

  // Click / Enter / Space on a cell. R3 (spec 025): a deliverable day commits the
  // draft and announces the selection; a blocked day is a NO-OP that echoes its
  // localised reason to the live region instead of silently doing nothing.
  function attemptSelect(iso: IsoDate) {
    const cell = monthView.cells.find((c) => c.iso === iso);
    if (!cell) return;
    if (cell.blocked) {
      if (cell.blockedReason) {
        setAnnouncement(blockedReasonText(cell.blockedReason, locale, resolvedLabels));
      }
      return;
    }
    setDraft(iso);
    announceSelection(iso);
  }

  function handleDialogKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      requestClose(false);
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = getFocusable(dialogRef.current);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleGridKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (GRID_KEYS.has(event.key)) {
      event.preventDefault();
      const next = moveFocus(activeIso, event.key as GridKey, viewYear, viewMonth);
      setActiveIso(next);
      setFocusTick((n) => n + 1);
      // R3 (spec 025): announce the draft when focus lands on a deliverable day.
      // On a blocked day the cell's own aria-label is read natively, so clear the
      // status region rather than leaving a stale "Delivery set to …".
      const nextCell = monthView.cells.find((c) => c.iso === next);
      if (nextCell && !nextCell.blocked) announceSelection(next);
      else setAnnouncement("");
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      attemptSelect(activeIso);
    }
  }

  const rootVars = {
    "--sdp-surface": theme.surface,
    "--sdp-accent": theme.accent,
  } as CSSProperties;

  return (
    <div style={{ ...rootVars, fontFamily: FONT_SANS, color: theme.ink }}>
      <ClosedCard
        theme={theme}
        locale={locale}
        labels={resolvedLabels}
        committed={committed}
        isEarliest={committed === earliest}
        changeRef={changeRef}
        onChange={open}
      />

      {state !== "closed" && (
        <Modal
          theme={theme}
          locale={locale}
          labels={resolvedLabels}
          state={state}
          overlayRef={overlayRef}
          dialogRef={dialogRef}
          labelId={labelId}
          monthId={monthId}
          year={viewYear}
          month={viewMonth}
          weeks={toWeeks(monthView.leadingBlanks, monthView.cells)}
          activeIso={activeIso}
          announcement={announcement}
          cellRefs={cellRefs}
          onAnimationEnd={handleAnimationEnd}
          onDialogKeyDown={handleDialogKeyDown}
          onGridKeyDown={handleGridKeyDown}
          onBackdrop={() => requestClose(false)}
          onSelect={attemptSelect}
          onCancel={() => requestClose(false)}
          onConfirm={() => requestClose(true)}
        />
      )}
    </div>
  );
}

interface ClosedCardProps {
  theme: DeliveryTheme;
  locale: string;
  labels: DeliveryLabels;
  committed: IsoDate;
  isEarliest: boolean;
  changeRef: RefObject<HTMLButtonElement | null>;
  onChange: () => void;
}

function ClosedCard({
  theme,
  locale,
  labels,
  committed,
  isEarliest,
  changeRef,
  onChange,
}: ClosedCardProps) {
  const dayNumber = parseIso(committed).getUTCDate();
  return (
    <div
      style={{
        background: theme.surface,
        border: `1.5px solid ${theme.border}`,
        borderRadius: appTokens.radius.surface,
        padding: 16,
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        aria-hidden
        style={{
          width: 52,
          height: 52,
          borderRadius: theme.radiusControl,
          border: `1px solid ${theme.cellBorder}`,
          background: theme.surface,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            height: 14,
            background: theme.accentTint,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
          }}
        >
          <Dot color={theme.accent} />
          <Dot color={theme.accent} />
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT_SERIF,
            fontSize: 20,
            fontWeight: 700,
            color: theme.ink,
          }}
        >
          {dayNumber}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: "0.12em",
            color: theme.inkMuted,
            textTransform: "uppercase",
          }}
        >
          {isEarliest ? labels.earliestDelivery : labels.deliveryDate}
        </div>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 600, color: theme.ink }}>
          {formatDate(committed, locale, { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <div style={{ display: "flex" }}>
          <span
            style={{
              background: theme.pillBg,
              color: theme.pillText,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              padding: "4px 10px",
              borderRadius: theme.radiusPill,
              textTransform: "uppercase",
            }}
          >
            {labels.freeDelivery}
          </span>
        </div>
      </div>

      <button
        ref={changeRef}
        type="button"
        onClick={onChange}
        style={{
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          padding: "0 8px",
          color: theme.accent,
          fontWeight: 700,
          fontSize: 14,
          textDecoration: "underline",
          textUnderlineOffset: 3,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: FONT_SANS,
        }}
      >
        {labels.change}
      </button>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <div style={{ width: 3, height: 3, borderRadius: 99, background: color }} />;
}

interface ModalProps {
  theme: DeliveryTheme;
  locale: string;
  labels: DeliveryLabels;
  state: DialogState;
  overlayRef: RefObject<HTMLDivElement | null>;
  dialogRef: RefObject<HTMLDivElement | null>;
  labelId: string;
  monthId: string;
  year: number;
  month: number;
  weeks: (DateCell | null)[][];
  activeIso: IsoDate;
  announcement: string;
  cellRefs: RefObject<Map<IsoDate, HTMLButtonElement>>;
  onAnimationEnd: (e: ReactAnimationEvent<HTMLDivElement>) => void;
  onDialogKeyDown: (e: ReactKeyboardEvent<HTMLDivElement>) => void;
  onGridKeyDown: (e: ReactKeyboardEvent<HTMLDivElement>) => void;
  onBackdrop: () => void;
  onSelect: (iso: IsoDate) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

function Modal(props: ModalProps) {
  const {
    theme,
    locale,
    labels,
    state,
    overlayRef,
    dialogRef,
    labelId,
    monthId,
    year,
    month,
    weeks,
    activeIso,
    announcement,
    cellRefs,
  } = props;
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
  const weekdayHeaders = Array.from({ length: 7 }, (_, i) => ({
    narrow: weekdayName(i, locale, "narrow"),
    long: weekdayName(i, locale, "long"),
  }));
  return (
    <div ref={overlayRef} style={{ position: "fixed", inset: 0, zIndex: 1000 }}>
      <div
        className="sdp-backdrop"
        data-state={state}
        onClick={props.onBackdrop}
        style={{ position: "absolute", inset: 0, background: theme.scrim }}
      />
      <div
        ref={dialogRef}
        className="sdp-modal"
        data-state={state}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        onKeyDown={props.onDialogKeyDown}
        onAnimationEnd={props.onAnimationEnd}
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          top: "50%",
          transform: "translateY(-50%)",
          background: theme.surface,
          borderRadius: theme.radiusModal ?? theme.radiusControl + 8,
          boxShadow: `0 32px 64px -24px ${theme.scrim}`,
          padding: "20px 16px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          maxWidth: 420,
          marginInline: "auto",
          // Spec 034: scroll inside the modal on short viewports (landscape
          // phone / soft-keyboard) instead of overflowing past the visible
          // area. The 32 px gutter matches the `left: 16, right: 16` insets.
          maxHeight: "calc(100dvh - 32px)",
          overflowY: "auto",
        }}
      >
        {/* R3 (spec 025): visually-hidden polite live region for AT announcements. */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
            clipPath: "inset(50%)",
            whiteSpace: "nowrap",
          }}
        >
          {announcement}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 4px" }}>
          <div
            id={labelId}
            style={{ fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 600, color: theme.ink }}
          >
            {labels.dialogTitle}
          </div>
          <div
            id={monthId}
            style={{
              fontFamily: FONT_MONO,
              fontSize: 11,
              letterSpacing: "0.12em",
              color: theme.inkMuted,
            }}
          >
            {monthLabel.toUpperCase()}
          </div>
        </div>

        <div
          role="grid"
          aria-labelledby={`${labelId} ${monthId}`}
          onKeyDown={props.onGridKeyDown}
          style={{ display: "flex", flexDirection: "column", gap: 6 }}
        >
          <div role="row" style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
            {weekdayHeaders.map((hdr, i) => (
              <div
                key={i}
                role="columnheader"
                abbr={hdr.long}
                style={{
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  color: theme.inkMuted,
                }}
              >
                {hdr.narrow}
              </div>
            ))}
          </div>

          {weeks.map((week, wi) => (
            <div
              key={wi}
              role="row"
              style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}
            >
              {week.map((cell, ci) =>
                cell === null ? (
                  <div key={ci} role="gridcell" aria-hidden style={{ minHeight: 44 }} />
                ) : (
                  <DayCell
                    key={cell.iso}
                    theme={theme}
                    locale={locale}
                    labels={labels}
                    cell={cell}
                    isActive={cell.iso === activeIso}
                    cellRefs={cellRefs}
                    onSelect={props.onSelect}
                  />
                ),
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, paddingTop: 2 }}>
          <button
            type="button"
            onClick={props.onCancel}
            style={{
              flex: 1,
              minHeight: 48,
              borderRadius: theme.radiusCta,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              fontWeight: 600,
              color: theme.inkMuted,
              border: `1.5px solid ${theme.border}`,
              background: "transparent",
              cursor: "pointer",
              fontFamily: FONT_SANS,
            }}
          >
            {labels.cancel}
          </button>
          <button
            type="button"
            onClick={props.onConfirm}
            style={{
              flex: 1.4,
              minHeight: 48,
              borderRadius: theme.radiusCta,
              background: theme.accent,
              color: theme.accentInk,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              fontFamily: FONT_SANS,
            }}
          >
            {labels.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}

interface DayCellProps {
  theme: DeliveryTheme;
  locale: string;
  labels: DeliveryLabels;
  cell: DateCell;
  isActive: boolean;
  cellRefs: RefObject<Map<IsoDate, HTMLButtonElement>>;
  onSelect: (iso: IsoDate) => void;
}

function DayCell({ theme, locale, labels, cell, isActive, cellRefs, onSelect }: DayCellProps) {
  const reasonText = cell.blockedReason
    ? blockedReasonText(cell.blockedReason, locale, labels)
    : null;
  const fullDateLabel = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${cell.iso}T00:00:00Z`));
  const cellAriaLabel = reasonText ? `${fullDateLabel} — ${reasonText}` : fullDateLabel;
  const base: CSSProperties = {
    minHeight: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radiusControl,
    fontSize: 15,
    border: "1px solid transparent",
    background: "transparent",
    fontFamily: FONT_SANS,
    padding: 0,
  };

  let skin: CSSProperties;
  if (cell.isSelected) {
    skin = {
      background: theme.accent,
      border: `1px solid ${theme.accent}`,
      color: theme.accentInk,
      fontWeight: 700,
    };
  } else if (cell.blocked) {
    skin = { color: theme.dayMuted, fontWeight: 400 };
  } else {
    skin = {
      background: theme.surface,
      border: `1px solid ${theme.cellBorder}`,
      color: theme.ink,
      fontWeight: 500,
    };
  }

  // R4 (spec 025): role="gridcell" + aria-selected live on the focused <button>
  // itself, not a wrapper, so screen readers announce selection state on the
  // element roving tabindex actually focuses. (Empty cells keep their wrapper.)
  return (
    <button
      type="button"
      role="gridcell"
      aria-selected={cell.isSelected}
      className="sdp-cell"
      ref={(el) => {
        if (el) cellRefs.current.set(cell.iso, el);
        else cellRefs.current.delete(cell.iso);
      }}
      tabIndex={isActive ? 0 : -1}
      aria-label={cellAriaLabel}
      aria-disabled={cell.blocked || undefined}
      onClick={() => onSelect(cell.iso)}
      style={{ ...base, ...skin, width: "100%", cursor: cell.blocked ? "default" : "pointer" }}
    >
      {cell.day}
    </button>
  );
}
