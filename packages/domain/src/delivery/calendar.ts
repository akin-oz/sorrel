/**
 * Delivery-date domain logic for the Sorrel funnel (spec 001).
 *
 * Pure, timezone-safe calendar math: Monday-first weeks, blocked weekdays
 * (Tue / Fri / Sat), earliest-deliverable computation, month-grid generation,
 * and keyboard-grid navigation. No React, no I/O — unit-tested in isolation.
 *
 * Dates are ISO calendar strings ("YYYY-MM-DD"). All arithmetic runs in UTC so
 * results never shift with the host timezone.
 */

export type IsoDate = string;

/** Column order for a Monday-first calendar. */
export const MONDAY_FIRST_WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"] as const;

const WEEKDAY_LONG = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Tue / Fri / Sat are undeliverable. Monday-first indexes: Tue=1, Fri=4, Sat=5. */
export const BLOCKED_WEEKDAY_INDEXES: ReadonlySet<number> = new Set([1, 4, 5]);

/** First deliverable day is at least this many days out from "today". */
export const DEFAULT_LEAD_DAYS = 3;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function toIso(date: Date): IsoDate {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function parseIso(iso: IsoDate): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const date = parseIso(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
}

export function daysInMonth(year: number, month: number): number {
  // month is 1-12; day 0 of the next month is the last day of this one.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Monday-first weekday index: Mon=0 … Sun=6. */
export function mondayIndex(iso: IsoDate): number {
  return (parseIso(iso).getUTCDay() + 6) % 7;
}

export function weekdayLongName(iso: IsoDate): string {
  return WEEKDAY_LONG[mondayIndex(iso)];
}

export function isDeliverableWeekday(iso: IsoDate): boolean {
  return !BLOCKED_WEEKDAY_INDEXES.has(mondayIndex(iso));
}

/** "Monday 15 June" — the closed-card and reason format. */
export function formatLongDate(iso: IsoDate): string {
  const date = parseIso(iso);
  return `${WEEKDAY_LONG[mondayIndex(iso)]} ${date.getUTCDate()} ${MONTH_LONG[date.getUTCMonth()]}`;
}

/** The earliest deliverable day: first non-blocked day on or after today + leadDays. */
export function earliestDeliverableDate(
  today: IsoDate,
  leadDays: number = DEFAULT_LEAD_DAYS,
): IsoDate {
  let candidate = addDays(today, leadDays);
  while (!isDeliverableWeekday(candidate)) {
    candidate = addDays(candidate, 1);
  }
  return candidate;
}

/**
 * Why a day is blocked, as a locale-agnostic code the UI formats. The pure domain
 * stays free of display strings so the picker can localise the aria text.
 */
export type BlockedReason =
  | { code: "BEFORE_EARLIEST"; earliest: IsoDate }
  | { code: "BLOCKED_WEEKDAY"; weekdayIndex: number };

export interface BlockedInfo {
  blocked: boolean;
  /** Structured reason for an aria-disabled cell, or null when deliverable. */
  reason: BlockedReason | null;
}

export function blockedInfo(iso: IsoDate, earliest: IsoDate): BlockedInfo {
  if (iso < earliest) {
    return { blocked: true, reason: { code: "BEFORE_EARLIEST", earliest } };
  }
  if (!isDeliverableWeekday(iso)) {
    return { blocked: true, reason: { code: "BLOCKED_WEEKDAY", weekdayIndex: mondayIndex(iso) } };
  }
  return { blocked: false, reason: null };
}

export interface DateCell {
  iso: IsoDate;
  day: number;
  /** Monday-first 0…6. */
  weekdayIndex: number;
  deliverable: boolean;
  blocked: boolean;
  blockedReason: BlockedReason | null;
  isSelected: boolean;
  isEarliest: boolean;
}

export interface MonthView {
  year: number;
  /** 1-12. */
  month: number;
  /** "June 2026". */
  monthLabel: string;
  /** Empty leading cells needed to align day 1 under its Monday-first column. */
  leadingBlanks: number;
  cells: DateCell[];
}

export interface MonthViewOptions {
  earliest: IsoDate;
  selected?: IsoDate;
}

/**
 * Build a single month's cells, Monday-first. Handles any start/end weekday via
 * `leadingBlanks`; the grid is intentionally a single month (no overflow days),
 * matching the design.
 */
export function buildMonthView(year: number, month: number, opts: MonthViewOptions): MonthView {
  const firstIso = `${year}-${pad2(month)}-01`;
  const leadingBlanks = mondayIndex(firstIso);
  const total = daysInMonth(year, month);
  const cells: DateCell[] = [];

  for (let day = 1; day <= total; day += 1) {
    const iso = `${year}-${pad2(month)}-${pad2(day)}`;
    const { blocked, reason } = blockedInfo(iso, opts.earliest);
    cells.push({
      iso,
      day,
      weekdayIndex: mondayIndex(iso),
      deliverable: !blocked,
      blocked,
      blockedReason: reason,
      isSelected: opts.selected === iso,
      isEarliest: opts.earliest === iso,
    });
  }

  return {
    year,
    month,
    monthLabel: `${MONTH_LONG[month - 1]} ${year}`,
    leadingBlanks,
    cells,
  };
}

export function clampToMonth(iso: IsoDate, year: number, month: number): IsoDate {
  const first = `${year}-${pad2(month)}-01`;
  const last = `${year}-${pad2(month)}-${pad2(daysInMonth(year, month))}`;
  if (iso < first) return first;
  if (iso > last) return last;
  return iso;
}

/**
 * Pack a flat list of month cells into Monday-first week rows, padding the
 * trailing row with `null` to 7 columns. The leading-blanks count comes from
 * `buildMonthView` and reflects how many `null`s precede day 1 to align it
 * under its Monday-first column. Pure; the UI consumes this for the grid
 * layout without re-implementing the math (spec 030).
 */
export function toWeeks<T>(leadingBlanks: number, cells: readonly T[]): (T | null)[][] {
  const flat: (T | null)[] = [...Array.from({ length: leadingBlanks }, () => null), ...cells];
  const weeks: (T | null)[][] = [];
  for (let i = 0; i < flat.length; i += 7) {
    const week = flat.slice(i, i + 7);
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

/**
 * Pick the focus target when the calendar moves to (year, month).
 *
 * Prefers `preferredDay` in the new month if it exists AND is deliverable
 * (i.e. not blocked). If that day is blocked or does not exist in the month
 * (e.g. day 31 into a 30-day month), falls back to the first non-blocked,
 * non-before-earliest day in the month. Returns `null` when the month
 * contains no deliverable day at all — the caller should keep the current
 * view and not change the visible month.
 *
 * Reuses existing `buildMonthView` / `blockedInfo` primitives; no new date
 * math is introduced (spec 048).
 */
export function focusTargetForMonth(
  year: number,
  month: number,
  preferredDay: number,
  earliest: IsoDate,
): IsoDate | null {
  const view = buildMonthView(year, month, { earliest });
  // Try the preferred day first (clamped to what exists in this month).
  const clampedDay = Math.min(preferredDay, daysInMonth(year, month));
  const preferredIso = `${year}-${pad2(month)}-${pad2(clampedDay)}`;
  const preferredCell = view.cells.find((c) => c.iso === preferredIso);
  if (preferredCell && !preferredCell.blocked) return preferredIso;
  // Fall back to the first deliverable day in the month.
  const firstDeliverable = view.cells.find((c) => !c.blocked);
  return firstDeliverable?.iso ?? null;
}

export type GridKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Home" | "End";

/** Roving-tabindex movement within a single month grid (clamped to month bounds). */
export function moveFocus(currentIso: IsoDate, key: GridKey, year: number, month: number): IsoDate {
  switch (key) {
    case "ArrowLeft":
      return clampToMonth(addDays(currentIso, -1), year, month);
    case "ArrowRight":
      return clampToMonth(addDays(currentIso, 1), year, month);
    case "ArrowUp":
      return clampToMonth(addDays(currentIso, -7), year, month);
    case "ArrowDown":
      return clampToMonth(addDays(currentIso, 7), year, month);
    case "Home":
      return clampToMonth(addDays(currentIso, -mondayIndex(currentIso)), year, month);
    case "End":
      return clampToMonth(addDays(currentIso, 6 - mondayIndex(currentIso)), year, month);
    default:
      return currentIso;
  }
}
