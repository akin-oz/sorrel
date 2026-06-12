"use client";

import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import {
  type DateCell,
  type GridKey,
  type IsoDate,
  MONDAY_FIRST_WEEKDAYS,
  buildMonthView,
  earliestDeliverableDate,
  formatLongDate,
  moveFocus,
  parseIso,
  toIso,
} from "@sorrel/domain";

import { useInjectDeliveryStyles } from "./theme/styles";
import { type DeliveryTheme, FONT_MONO, FONT_SANS, FONT_SERIF, sorrelTheme } from "./theme/tokens";

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
  const nodes = root.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  return Array.from(nodes).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

export function DeliveryDatePicker({
  today: todayProp,
  value,
  defaultValue,
  leadDays,
  theme = sorrelTheme,
  onConfirm,
  onOpenChange,
}: DeliveryDatePickerProps) {
  useInjectDeliveryStyles();

  const today = todayProp ?? toIso(new Date());
  const earliest = earliestDeliverableDate(today, leadDays);

  const isControlled = value !== undefined;
  const [internalCommitted, setInternalCommitted] = useState<IsoDate>(defaultValue ?? earliest);
  const committed = isControlled ? value : internalCommitted;

  const [state, setState] = useState<DialogState>("closed");
  const [draft, setDraft] = useState<IsoDate>(committed);
  const [activeIso, setActiveIso] = useState<IsoDate>(committed);
  const [focusTick, setFocusTick] = useState(0);

  const changeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<IsoDate, HTMLButtonElement>>(new Map());
  const pendingConfirm = useRef<IsoDate | null>(null);
  const hasOpened = useRef(false);

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

  function open() {
    hasOpened.current = true;
    setDraft(committed);
    setActiveIso(committed);
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
    setState("closing");
    onOpenChange?.(false);
  }

  function handleAnimationEnd() {
    if (state !== "closing") return;
    setState("closed");
    const confirmed = pendingConfirm.current;
    pendingConfirm.current = null;
    if (confirmed !== null) onConfirm?.(confirmed);
  }

  function selectIfDeliverable(iso: IsoDate) {
    const cell = monthView.cells.find((c) => c.iso === iso);
    if (cell && !cell.blocked) setDraft(iso);
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
      setActiveIso(moveFocus(activeIso, event.key as GridKey, viewYear, viewMonth));
      setFocusTick((n) => n + 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectIfDeliverable(activeIso);
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
        committed={committed}
        isEarliest={committed === earliest}
        changeRef={changeRef}
        onChange={open}
      />

      {state !== "closed" && (
        <Modal
          theme={theme}
          state={state}
          dialogRef={dialogRef}
          labelId={labelId}
          monthId={monthId}
          monthLabel={monthView.monthLabel}
          weeks={toWeeks(monthView.leadingBlanks, monthView.cells)}
          activeIso={activeIso}
          cellRefs={cellRefs}
          onAnimationEnd={handleAnimationEnd}
          onDialogKeyDown={handleDialogKeyDown}
          onGridKeyDown={handleGridKeyDown}
          onBackdrop={() => requestClose(false)}
          onSelect={selectIfDeliverable}
          onCancel={() => requestClose(false)}
          onConfirm={() => requestClose(true)}
        />
      )}
    </div>
  );
}

function toWeeks(leadingBlanks: number, cells: DateCell[]): (DateCell | null)[][] {
  const flat: (DateCell | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...cells,
  ];
  const weeks: (DateCell | null)[][] = [];
  for (let i = 0; i < flat.length; i += 7) {
    const week = flat.slice(i, i + 7);
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

interface ClosedCardProps {
  theme: DeliveryTheme;
  committed: IsoDate;
  isEarliest: boolean;
  changeRef: RefObject<HTMLButtonElement | null>;
  onChange: () => void;
}

function ClosedCard({ theme, committed, isEarliest, changeRef, onChange }: ClosedCardProps) {
  const dayNumber = parseIso(committed).getUTCDate();
  return (
    <div
      style={{
        background: theme.surface,
        border: `1.5px solid ${theme.border}`,
        borderRadius: 16,
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
            color: theme.mono,
          }}
        >
          {isEarliest ? "EARLIEST DELIVERY" : "DELIVERY DATE"}
        </div>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 600, color: theme.ink }}>
          {formatLongDate(committed)}
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
            Free delivery
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
        Change
      </button>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <div style={{ width: 3, height: 3, borderRadius: 99, background: color }} />;
}

interface ModalProps {
  theme: DeliveryTheme;
  state: DialogState;
  dialogRef: RefObject<HTMLDivElement | null>;
  labelId: string;
  monthId: string;
  monthLabel: string;
  weeks: (DateCell | null)[][];
  activeIso: IsoDate;
  cellRefs: RefObject<Map<IsoDate, HTMLButtonElement>>;
  onAnimationEnd: () => void;
  onDialogKeyDown: (e: ReactKeyboardEvent<HTMLDivElement>) => void;
  onGridKeyDown: (e: ReactKeyboardEvent<HTMLDivElement>) => void;
  onBackdrop: () => void;
  onSelect: (iso: IsoDate) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

function Modal(props: ModalProps) {
  const { theme, state, dialogRef, labelId, monthId, monthLabel, weeks, activeIso, cellRefs } =
    props;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000 }}>
      <div
        className="sdp-backdrop"
        data-state={state}
        onClick={props.onBackdrop}
        style={{ position: "absolute", inset: 0, background: "rgba(46,37,32,0.5)" }}
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
          borderRadius: theme.radiusControl + 8,
          boxShadow: "0 32px 64px -24px rgba(46,37,32,0.5)",
          padding: "20px 16px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          maxWidth: 420,
          marginInline: "auto",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 4px" }}>
          <div
            id={labelId}
            style={{ fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 600, color: theme.ink }}
          >
            Choose a delivery day
          </div>
          <div
            id={monthId}
            style={{
              fontFamily: FONT_MONO,
              fontSize: 11,
              letterSpacing: "0.12em",
              color: theme.mono,
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
            {MONDAY_FIRST_WEEKDAYS.map((label, i) => (
              <div
                key={i}
                role="columnheader"
                style={{
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  color: theme.mono,
                }}
              >
                {label}
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
            Cancel
          </button>
          <button
            type="button"
            onClick={props.onConfirm}
            style={{
              flex: 1.4,
              minHeight: 48,
              borderRadius: theme.radiusCta,
              background: theme.accent,
              color: theme.onAccent,
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
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

interface DayCellProps {
  theme: DeliveryTheme;
  cell: DateCell;
  isActive: boolean;
  cellRefs: RefObject<Map<IsoDate, HTMLButtonElement>>;
  onSelect: (iso: IsoDate) => void;
}

function DayCell({ theme, cell, isActive, cellRefs, onSelect }: DayCellProps) {
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
      color: theme.onAccent,
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

  return (
    <button
      type="button"
      className="sdp-cell"
      role="gridcell"
      ref={(el) => {
        if (el) cellRefs.current.set(cell.iso, el);
        else cellRefs.current.delete(cell.iso);
      }}
      tabIndex={isActive ? 0 : -1}
      aria-label={
        cell.blocked && cell.blockedReason ? `${cell.day} — ${cell.blockedReason}` : undefined
      }
      aria-selected={cell.isSelected}
      aria-disabled={cell.blocked || undefined}
      onClick={() => onSelect(cell.iso)}
      style={{ ...base, ...skin, cursor: cell.blocked ? "default" : "pointer" }}
    >
      {cell.day}
    </button>
  );
}
