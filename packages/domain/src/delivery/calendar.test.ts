import {
  addDays,
  blockedInfo,
  buildMonthView,
  clampToMonth,
  daysInMonth,
  earliestDeliverableDate,
  formatLongDate,
  isDeliverableWeekday,
  mondayIndex,
  moveFocus,
  parseIso,
  toIso,
  toWeeks,
} from "./calendar";

describe("daysInMonth (month boundaries)", () => {
  it("handles 31/30/28/29-day months", () => {
    expect(daysInMonth(2026, 1)).toBe(31); // Jan
    expect(daysInMonth(2026, 4)).toBe(30); // Apr
    expect(daysInMonth(2026, 6)).toBe(30); // Jun
    expect(daysInMonth(2026, 12)).toBe(31); // Dec
  });

  it("handles February in common and leap years", () => {
    expect(daysInMonth(2026, 2)).toBe(28); // common
    expect(daysInMonth(2024, 2)).toBe(29); // leap (div 4)
    expect(daysInMonth(2000, 2)).toBe(29); // leap (div 400)
    expect(daysInMonth(1900, 2)).toBe(28); // not leap (div 100, not 400)
  });
});

describe("addDays crosses month and year boundaries", () => {
  it("rolls forward across a month boundary", () => {
    expect(addDays("2026-06-30", 1)).toBe("2026-07-01");
  });

  it("rolls forward across a year boundary", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("rolls backward across a month boundary", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29"); // leap
  });
});

describe("mondayIndex (Monday-first)", () => {
  it("maps weekdays to Monday-first indexes", () => {
    expect(mondayIndex("2026-06-15")).toBe(0); // Monday
    expect(mondayIndex("2026-06-16")).toBe(1); // Tuesday
    expect(mondayIndex("2026-06-12")).toBe(4); // Friday
    expect(mondayIndex("2026-06-13")).toBe(5); // Saturday
    expect(mondayIndex("2026-06-14")).toBe(6); // Sunday
  });

  it("confirms June 2026 starts on Monday (design assumption)", () => {
    expect(mondayIndex("2026-06-01")).toBe(0);
  });
});

describe("isDeliverableWeekday (Tue / Fri / Sat blocked)", () => {
  it("blocks Tuesday, Friday, Saturday", () => {
    expect(isDeliverableWeekday("2026-06-16")).toBe(false); // Tue
    expect(isDeliverableWeekday("2026-06-12")).toBe(false); // Fri
    expect(isDeliverableWeekday("2026-06-13")).toBe(false); // Sat
  });

  it("allows Mon / Wed / Thu / Sun", () => {
    expect(isDeliverableWeekday("2026-06-15")).toBe(true); // Mon
    expect(isDeliverableWeekday("2026-06-17")).toBe(true); // Wed
    expect(isDeliverableWeekday("2026-06-18")).toBe(true); // Thu
    expect(isDeliverableWeekday("2026-06-14")).toBe(true); // Sun
  });
});

describe("earliestDeliverableDate", () => {
  it("is Monday 15 June for today = Fri 12 June 2026 (the design case)", () => {
    expect(earliestDeliverableDate("2026-06-12")).toBe("2026-06-15");
  });

  it("rolls past a blocked landing day", () => {
    // Tue 9 Jun + 3 lead = Fri 12 (blocked) -> Sat 13 (blocked) -> Sun 14 (ok)
    expect(earliestDeliverableDate("2026-06-09")).toBe("2026-06-14");
  });

  it("crosses a month boundary when needed", () => {
    // Mon 29 Jun + 3 = Thu 2 Jul (deliverable)
    expect(earliestDeliverableDate("2026-06-29")).toBe("2026-07-02");
  });

  it("respects a custom lead time", () => {
    expect(earliestDeliverableDate("2026-06-12", 0)).toBe("2026-06-14"); // Sun 14
  });

  it("crosses a year boundary when needed", () => {
    // Wed 30 Dec 2026 + 3 lead = Sat 2 Jan 2027 (blocked) -> Sun 3 Jan 2027 (deliverable).
    const result = earliestDeliverableDate("2026-12-30");
    expect(result).toBe("2027-01-03");
    expect(result.slice(0, 4)).toBe("2027");
  });
});

describe("formatLongDate", () => {
  it("formats as 'Weekday D Month'", () => {
    expect(formatLongDate("2026-06-15")).toBe("Monday 15 June");
    expect(formatLongDate("2026-07-02")).toBe("Thursday 2 July");
  });
});

describe("blockedInfo reasons", () => {
  const earliest = "2026-06-15";

  it("flags days before the earliest with a structured reason", () => {
    expect(blockedInfo("2026-06-08", earliest)).toEqual({
      blocked: true,
      reason: { code: "BEFORE_EARLIEST", earliest: "2026-06-15" },
    });
  });

  it("flags blocked weekdays with the weekday reason (Fri = Monday-index 4)", () => {
    expect(blockedInfo("2026-06-19", earliest)).toEqual({
      blocked: true,
      reason: { code: "BLOCKED_WEEKDAY", weekdayIndex: 4 },
    });
  });

  it("treats a deliverable day as unblocked", () => {
    expect(blockedInfo("2026-06-17", earliest)).toEqual({ blocked: false, reason: null });
  });
});

describe("buildMonthView", () => {
  const earliest = "2026-06-15";

  it("aligns June 2026 with zero leading blanks and 30 cells", () => {
    const view = buildMonthView(2026, 6, { earliest, selected: earliest });
    expect(view.monthLabel).toBe("June 2026");
    expect(view.leadingBlanks).toBe(0);
    expect(view.cells).toHaveLength(30);
    expect(view.cells[0]?.iso).toBe("2026-06-01");
    expect(view.cells[29]?.day).toBe(30);
  });

  it("computes leading blanks for a month that does not start on Monday", () => {
    // 1 July 2026 is a Wednesday -> Monday-index 2.
    const july = buildMonthView(2026, 7, { earliest });
    expect(july.leadingBlanks).toBe(2);
    expect(july.cells).toHaveLength(31);
  });

  it("marks selected, earliest, and blocked cells", () => {
    const view = buildMonthView(2026, 6, { earliest, selected: earliest });
    const byDay = (d: number) => view.cells.find((c) => c.day === d);

    expect(byDay(15)?.isSelected).toBe(true);
    expect(byDay(15)?.isEarliest).toBe(true);
    expect(byDay(15)?.blocked).toBe(false);

    expect(byDay(12)?.blocked).toBe(true); // Fri, also before earliest
    expect(byDay(19)?.blocked).toBe(true); // Fri
    expect(byDay(19)?.blockedReason).toEqual({ code: "BLOCKED_WEEKDAY", weekdayIndex: 4 });

    expect(byDay(8)?.blocked).toBe(true); // before earliest
    expect(byDay(8)?.blockedReason).toEqual({ code: "BEFORE_EARLIEST", earliest: "2026-06-15" });

    expect(byDay(17)?.blocked).toBe(false); // Wed, after earliest
  });

  it("emits all 30 days of June so the imported toWeeks yields a partial trailing row", () => {
    // June 2026 ends on Tuesday 30 (mondayIndex 1, non-Sunday).
    const view = buildMonthView(2026, 6, { earliest });

    expect(view.cells[view.cells.length - 1]?.iso).toBe("2026-06-30");
    expect(mondayIndex("2026-06-30")).toBe(1); // Tuesday
    expect(view.leadingBlanks + view.cells.length).toBe(30); // single month, no overflow.

    // The picker consumes `toWeeks` from @sorrel/domain (spec 030). Last week
    // must contain only Mon 29 + Tue 30, then 5 nulls.
    type Cell = (typeof view.cells)[number];
    const weeks = toWeeks<Cell>(view.leadingBlanks, view.cells);
    const lastWeek = weeks[weeks.length - 1];
    const days = lastWeek.filter((c): c is Cell => c !== null).map((c) => c.day);
    expect(days).toEqual([29, 30]);
    expect(lastWeek.filter((c) => c === null)).toHaveLength(5);
  });
});

// --- Spec 030: calendar-domain edge cases (D-01 … D-10) ------------------------

describe("D-01: Feb 2024 leap-month grid", () => {
  it("computes leadingBlanks=3, 29 cells, last iso=2024-02-29", () => {
    // 1 Feb 2024 is a Thursday (Monday-index 3).
    const view = buildMonthView(2024, 2, { earliest: "2024-02-01" });
    expect(view.leadingBlanks).toBe(3);
    expect(view.cells).toHaveLength(29);
    expect(view.cells[view.cells.length - 1]?.iso).toBe("2024-02-29");
  });
});

describe("D-02: March 2026 after Feb-common handoff", () => {
  it("computes leadingBlanks=6, 31 cells, first iso=2026-03-01 (Sunday)", () => {
    // March 1 2026 is a Sunday (Monday-index 6).
    const view = buildMonthView(2026, 3, { earliest: "2026-03-01" });
    expect(view.leadingBlanks).toBe(6);
    expect(view.cells).toHaveLength(31);
    expect(view.cells[0]?.iso).toBe("2026-03-01");
    expect(mondayIndex("2026-03-01")).toBe(6);
  });
});

describe("D-03: January 2026 starts Thursday", () => {
  it("computes leadingBlanks=3 and 31 cells", () => {
    const view = buildMonthView(2026, 1, { earliest: "2026-01-01" });
    expect(view.leadingBlanks).toBe(3);
    expect(view.cells).toHaveLength(31);
    expect(view.cells[0]?.iso).toBe("2026-01-01");
  });
});

describe("D-04: DST spring-forward stays a single ISO day", () => {
  it("rolls 2026-03-28 → 2026-03-29 without skipping or duplicating", () => {
    // 29 March 2026 is the European DST spring-forward date. Any local-time
    // addDays would either skip or duplicate the day; UTC math is stable.
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29");
    expect(mondayIndex("2026-03-29")).toBe(6); // Sunday
  });
});

describe("D-05: earliestDeliverableDate Thu+4 ⇒ Mon", () => {
  it("returns 2026-06-15 for today=2026-06-11 (Thursday) with leadDays=4", () => {
    expect(earliestDeliverableDate("2026-06-11", 4)).toBe("2026-06-15");
  });
});

describe("D-06: earliestDeliverableDate Tue→Wed one-step skip", () => {
  it("rolls Sat+3=Tue (blocked) to Wed", () => {
    // 2026-06-13 (Sat) + 3 = 2026-06-16 (Tue, blocked) → 2026-06-17 (Wed).
    expect(earliestDeliverableDate("2026-06-13", 3)).toBe("2026-06-17");
  });
});

describe("D-07: moveFocus Sunday + End is a no-op", () => {
  it("returns the same Sunday ISO with no leak into next week", () => {
    // 2026-06-21 is a Sunday (mondayIndex 6); End adds 6 - 6 = 0 days.
    expect(moveFocus("2026-06-21", "End", 2026, 6)).toBe("2026-06-21");
  });
});

describe("D-08: IsoDate UTC round-trip under a non-UTC TZ shim", () => {
  const previousTz = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = "America/New_York";
  });
  afterAll(() => {
    if (previousTz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = previousTz;
    }
  });

  it("toIso ∘ parseIso is identity for the Jan-1 year-boundary date", () => {
    expect(toIso(parseIso("2026-01-01"))).toBe("2026-01-01");
  });

  it("toIso ∘ parseIso is identity for a mid-year date", () => {
    expect(toIso(parseIso("2026-06-15"))).toBe("2026-06-15");
  });
});

describe("D-09: toWeeks pads the last row to 7", () => {
  it("for June 2026: last week non-null days are [29, 30], trailing nulls = 5, every row length 7", () => {
    const view = buildMonthView(2026, 6, { earliest: "2026-06-15" });
    type Cell = (typeof view.cells)[number];
    const weeks = toWeeks<Cell>(view.leadingBlanks, view.cells);

    for (const week of weeks) {
      expect(week).toHaveLength(7);
    }
    const lastWeek = weeks[weeks.length - 1];
    const days = lastWeek.filter((c): c is Cell => c !== null).map((c) => c.day);
    expect(days).toEqual([29, 30]);
    expect(lastWeek.filter((c) => c === null)).toHaveLength(5);
  });
});

describe("D-10: earliestDeliverableDate never lands on a blocked weekday over a 365-day sweep", () => {
  it("holds for every day in 2026", () => {
    let today = "2026-01-01";
    let safety = 0;
    while (today <= "2026-12-31") {
      const earliest = earliestDeliverableDate(today);
      expect(isDeliverableWeekday(earliest)).toBe(true);
      today = addDays(today, 1);
      safety += 1;
      if (safety > 366) throw new Error("sweep overran");
    }
    expect(safety).toBe(365);
  });
});

describe("clampToMonth", () => {
  it("clamps to the first and last day of the month", () => {
    expect(clampToMonth("2026-05-31", 2026, 6)).toBe("2026-06-01");
    expect(clampToMonth("2026-07-01", 2026, 6)).toBe("2026-06-30");
    expect(clampToMonth("2026-06-15", 2026, 6)).toBe("2026-06-15");
  });
});

describe("moveFocus (roving tabindex, clamped to month)", () => {
  it("moves by single days", () => {
    expect(moveFocus("2026-06-15", "ArrowRight", 2026, 6)).toBe("2026-06-16");
    expect(moveFocus("2026-06-15", "ArrowLeft", 2026, 6)).toBe("2026-06-14");
  });

  it("moves by weeks", () => {
    expect(moveFocus("2026-06-15", "ArrowDown", 2026, 6)).toBe("2026-06-22");
    expect(moveFocus("2026-06-15", "ArrowUp", 2026, 6)).toBe("2026-06-08");
  });

  it("clamps at the month edges", () => {
    expect(moveFocus("2026-06-01", "ArrowLeft", 2026, 6)).toBe("2026-06-01");
    expect(moveFocus("2026-06-03", "ArrowUp", 2026, 6)).toBe("2026-06-01");
    expect(moveFocus("2026-06-28", "ArrowDown", 2026, 6)).toBe("2026-06-30");
  });

  it("Home/End jump to the week edges", () => {
    // Wed 17 Jun -> Home -> Mon 15 Jun
    expect(moveFocus("2026-06-17", "Home", 2026, 6)).toBe("2026-06-15");
    // Mon 15 Jun -> End -> Sun 21 Jun
    expect(moveFocus("2026-06-15", "End", 2026, 6)).toBe("2026-06-21");
  });
});
