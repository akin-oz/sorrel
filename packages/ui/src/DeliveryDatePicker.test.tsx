import type { ComponentProps } from "react";

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";

import { DEFAULT_DELIVERY_LABELS, DeliveryDatePicker } from "./DeliveryDatePicker";
import {
  DELIVERY_THEME_STRUCTURAL_CHECK_BRAMBLE,
  DELIVERY_THEME_STRUCTURAL_CHECK_SORREL,
} from "./theme/__type-checks__/DeliveryTheme.types";
import { brambleTheme, sorrelTheme } from "./theme/tokens";

// Fixed clock mirrors packages/domain/src/delivery/calendar.test.ts (the
// "today = 2026-06-12" design case). With DEFAULT_LEAD_DAYS = 3 this yields
// earliest = 2026-06-15 (Mon). 17 (Wed) is the next deliverable day; 16 (Tue)
// and 19 (Fri) are blocked weekdays AFTER earliest — exactly the cells the
// blocked-NO-OP test needs.
const TODAY = "2026-06-12";
const EARLIEST_DAY = "15";
const NEXT_DELIVERABLE_ISO = "2026-06-17";
const NEXT_DELIVERABLE_DAY = "17";
const BLOCKED_FRIDAY_LABEL = "19 — No deliveries on Fridays";

type PickerProps = ComponentProps<typeof DeliveryDatePicker>;

function renderPicker(overrides: Partial<PickerProps> = {}) {
  return render(<DeliveryDatePicker today={TODAY} {...overrides} />);
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: DEFAULT_DELIVERY_LABELS.change }));
  return await screen.findByRole("dialog");
}

// Drive React past the closing → closed transition by firing animationend on
// the modal root (target === currentTarget). The safety-net 320 ms timer
// inside the component clears itself in finishClose.
function finishCloseAnimation(dialog: HTMLElement) {
  act(() => {
    fireEvent.animationEnd(dialog);
  });
}

// JSDOM does not compute layout, so `el.offsetParent` is `null` for elements
// the picker's `getFocusable` filter would otherwise include. Mocking it on
// every interactive node inside the dialog lets the focus-trap wrap logic
// (which depends on the FULL focusable list, not just the active element) run
// as it does in a real browser. Scoped per-test so it does not bleed.
function unblockFocusableInJsdom(dialog: HTMLElement) {
  const nodes = dialog.querySelectorAll<HTMLElement>('button, [tabindex]:not([tabindex="-1"])');
  nodes.forEach((el) => {
    Object.defineProperty(el, "offsetParent", {
      configurable: true,
      get() {
        return dialog;
      },
    });
  });
}

describe("DeliveryDatePicker", () => {
  describe("close chain (spec §2.1)", () => {
    it("unmounts the modal once the modal's own animationend fires", async () => {
      const user = userEvent.setup();
      renderPicker();
      const dialog = await openDialog(user);

      await user.click(screen.getByRole("button", { name: DEFAULT_DELIVERY_LABELS.cancel }));
      // Still in DOM during the "closing" state — exit anim is in flight.
      expect(screen.queryByRole("dialog")).toBeInTheDocument();

      finishCloseAnimation(dialog);
      // Conditional mount removes the modal from the DOM, not just hides it.
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("ignores an animationend bubbled from a descendant cell", async () => {
      const user = userEvent.setup();
      renderPicker();
      const dialog = await openDialog(user);
      await user.click(screen.getByRole("button", { name: DEFAULT_DELIVERY_LABELS.cancel }));

      // Day cells carry role="gridcell" (spec 025 R4), not the implicit button role.
      const someCell = within(dialog)
        .getAllByRole("gridcell")
        .find((b) => b.classList.contains("sdp-cell"));
      expect(someCell).toBeTruthy();

      act(() => {
        fireEvent.animationEnd(someCell as HTMLElement);
      });
      // Descendant animationend (target !== currentTarget) MUST NOT close.
      expect(screen.queryByRole("dialog")).toBeInTheDocument();

      // Finish properly so the 320 ms safety-net timer does not leak.
      finishCloseAnimation(dialog);
    });
  });

  // Spec 029 drops the reduced-motion modal AND backdrop animations to 1ms
  // (deliberately not 0s / `animation: none`) so the animationend event still
  // dispatches and drives finishClose. JSDOM does not evaluate the CSS media
  // query, but mocking matchMedia → matches:true documents the reduced-motion
  // environment and locks the regression spec 029 guards against: the
  // closing → closed chain must still unmount, and Confirm must still commit
  // the chosen ISO date, exactly as under default motion.
  describe("reduced-motion close chain (spec 029 — automated mirror of §2.1)", () => {
    let restoreMatchMedia: () => void;

    beforeEach(() => {
      const original = Object.getOwnPropertyDescriptor(window, "matchMedia");
      restoreMatchMedia = () => {
        if (original) {
          Object.defineProperty(window, "matchMedia", original);
        } else {
          Reflect.deleteProperty(window, "matchMedia");
        }
      };
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        writable: true,
        value: jest.fn((query: string) => ({
          matches: query.includes("prefers-reduced-motion"),
          media: query,
          onchange: null,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });
    });

    afterEach(() => {
      restoreMatchMedia();
    });

    it("still fires the modal animationend and commits onConfirm under reduced motion", async () => {
      const onConfirm = jest.fn();
      const user = userEvent.setup();
      renderPicker({ onConfirm });
      const dialog = await openDialog(user);

      // 15 → 16 (Tue, blocked) → 17 (Wed, deliverable); Enter commits the draft.
      await user.keyboard("{ArrowRight}{ArrowRight}{Enter}");
      await user.click(screen.getByRole("button", { name: DEFAULT_DELIVERY_LABELS.confirm }));
      // Still mounted while the (now 1 ms) exit animation is in flight.
      expect(screen.queryByRole("dialog")).toBeInTheDocument();

      finishCloseAnimation(dialog);

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onConfirm).toHaveBeenCalledWith(NEXT_DELIVERABLE_ISO);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("still unmounts via Cancel, ESC, and backdrop click under reduced motion", async () => {
      const onConfirm = jest.fn();
      const user = userEvent.setup();
      const { container } = renderPicker({ onConfirm });

      const cancelDialog = await openDialog(user);
      await user.click(screen.getByRole("button", { name: DEFAULT_DELIVERY_LABELS.cancel }));
      finishCloseAnimation(cancelDialog);
      expect(screen.queryByRole("dialog")).toBeNull();

      const escDialog = await openDialog(user);
      await user.keyboard("{Escape}");
      finishCloseAnimation(escDialog);
      expect(screen.queryByRole("dialog")).toBeNull();

      const backdropDialog = await openDialog(user);
      const backdrop = container.querySelector(".sdp-backdrop");
      expect(backdrop).toBeTruthy();
      await user.click(backdrop as HTMLElement);
      finishCloseAnimation(backdropDialog);
      expect(screen.queryByRole("dialog")).toBeNull();

      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe("confirm vs discard (spec §2.2)", () => {
    async function moveToNextDeliverable(user: ReturnType<typeof userEvent.setup>) {
      // active starts on earliest (Mon 15). →16 (Tue, blocked) →17 (Wed, deliverable).
      // Enter commits the draft on the deliverable 17.
      await user.keyboard("{ArrowRight}{ArrowRight}{Enter}");
    }

    it("commits the draft on Confirm", async () => {
      const onConfirm = jest.fn();
      const user = userEvent.setup();
      renderPicker({ onConfirm });
      const dialog = await openDialog(user);
      await moveToNextDeliverable(user);

      await user.click(screen.getByRole("button", { name: DEFAULT_DELIVERY_LABELS.confirm }));
      finishCloseAnimation(dialog);

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onConfirm).toHaveBeenCalledWith(NEXT_DELIVERABLE_ISO);
    });

    it("does NOT commit on Cancel", async () => {
      const onConfirm = jest.fn();
      const user = userEvent.setup();
      renderPicker({ onConfirm });
      const dialog = await openDialog(user);
      await moveToNextDeliverable(user);

      await user.click(screen.getByRole("button", { name: DEFAULT_DELIVERY_LABELS.cancel }));
      finishCloseAnimation(dialog);

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it("does NOT commit on backdrop click", async () => {
      const onConfirm = jest.fn();
      const user = userEvent.setup();
      const { container } = renderPicker({ onConfirm });
      const dialog = await openDialog(user);
      await moveToNextDeliverable(user);

      const backdrop = container.querySelector(".sdp-backdrop");
      expect(backdrop).toBeTruthy();
      await user.click(backdrop as HTMLElement);
      finishCloseAnimation(dialog);

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it("does NOT commit on ESC", async () => {
      const onConfirm = jest.fn();
      const user = userEvent.setup();
      renderPicker({ onConfirm });
      const dialog = await openDialog(user);
      await moveToNextDeliverable(user);

      await user.keyboard("{Escape}");
      finishCloseAnimation(dialog);

      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe("blocked-cell NO-OP (spec §2.3)", () => {
    function selectedDayText(dialog: HTMLElement): string {
      return within(dialog).getByRole("gridcell", { selected: true }).textContent ?? "";
    }

    it("ignores a click on a blocked day", async () => {
      const user = userEvent.setup();
      renderPicker();
      const dialog = await openDialog(user);

      await user.click(within(dialog).getByRole("gridcell", { name: BLOCKED_FRIDAY_LABEL }));
      expect(selectedDayText(dialog)).toBe(EARLIEST_DAY);

      await user.keyboard("{Escape}");
      finishCloseAnimation(dialog);
    });

    it("ignores Enter on a blocked active cell", async () => {
      const user = userEvent.setup();
      renderPicker();
      const dialog = await openDialog(user);

      // 15 → ArrowRight → active = 16 (Tue, blocked).
      await user.keyboard("{ArrowRight}{Enter}");
      expect(selectedDayText(dialog)).toBe(EARLIEST_DAY);

      await user.keyboard("{Escape}");
      finishCloseAnimation(dialog);
    });

    it("ignores Space on a blocked active cell", async () => {
      const user = userEvent.setup();
      renderPicker();
      const dialog = await openDialog(user);

      await user.keyboard("{ArrowRight}[Space]");
      expect(selectedDayText(dialog)).toBe(EARLIEST_DAY);

      await user.keyboard("{Escape}");
      finishCloseAnimation(dialog);
    });
  });

  describe("dynamic closed-state re-render (spec §2.4)", () => {
    it("re-renders dayNumber and the caption when committed changes", async () => {
      const user = userEvent.setup();
      renderPicker();

      // Initial: 15 + "Earliest delivery" caption (committed === earliest).
      expect(screen.getByText(EARLIEST_DAY)).toBeInTheDocument();
      expect(screen.getByText(DEFAULT_DELIVERY_LABELS.earliestDelivery)).toBeInTheDocument();
      expect(screen.queryByText(DEFAULT_DELIVERY_LABELS.deliveryDate)).toBeNull();

      const dialog = await openDialog(user);
      await user.keyboard("{ArrowRight}{ArrowRight}{Enter}");
      await user.click(screen.getByRole("button", { name: DEFAULT_DELIVERY_LABELS.confirm }));
      finishCloseAnimation(dialog);

      // After confirming 17: dayNumber flips and the caption swaps to "Delivery date".
      expect(screen.getByText(NEXT_DELIVERABLE_DAY)).toBeInTheDocument();
      expect(screen.getByText(DEFAULT_DELIVERY_LABELS.deliveryDate)).toBeInTheDocument();
      expect(screen.queryByText(DEFAULT_DELIVERY_LABELS.earliestDelivery)).toBeNull();
    });
  });

  describe("return-focus on close (spec §2.5)", () => {
    it("does not auto-focus the Change button on mount", () => {
      renderPicker();
      expect(
        screen.getByRole("button", { name: DEFAULT_DELIVERY_LABELS.change }),
      ).not.toHaveFocus();
    });

    it("returns focus to the Change button after the dialog closes", async () => {
      const user = userEvent.setup();
      renderPicker();
      const change = screen.getByRole("button", { name: DEFAULT_DELIVERY_LABELS.change });

      await user.click(change);
      const dialog = await screen.findByRole("dialog");
      await user.keyboard("{Escape}");
      finishCloseAnimation(dialog);

      expect(change).toHaveFocus();
    });
  });

  describe("a11y — jest-axe", () => {
    it("closed state has no a11y violations", async () => {
      const { container } = renderPicker();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("open dialog has no a11y violations", async () => {
      const user = userEvent.setup();
      const { container } = renderPicker();
      const dialog = await openDialog(user);

      const results = await axe(container);
      expect(results).toHaveNoViolations();

      // Close cleanly so the safety-net timer does not leak.
      await user.keyboard("{Escape}");
      finishCloseAnimation(dialog);
    });
  });

  describe("background inertness (spec 025 R2)", () => {
    it("marks the page outside the dialog inert while open and restores it on close", async () => {
      const user = userEvent.setup();
      renderPicker();
      // The closed card (and its Change button) sit beside the overlay — capture
      // it before opening, because once it is inert it leaves the a11y tree.
      const change = screen.getByRole("button", { name: DEFAULT_DELIVERY_LABELS.change });
      const card = change.parentElement as HTMLElement;
      expect(card.hasAttribute("inert")).toBe(false);

      const dialog = await openDialog(user);
      expect(card.hasAttribute("inert")).toBe(true);

      // Decision 2: inert is dropped the instant we enter "closing", before the
      // exit animation finishes, so AT can return to the page sooner.
      await user.keyboard("{Escape}");
      expect(card.hasAttribute("inert")).toBe(false);
      expect(card.hasAttribute("aria-hidden")).toBe(false);

      finishCloseAnimation(dialog);
    });
  });

  describe("aria-selected on the focused element (spec 025 R4)", () => {
    it("puts role=gridcell + aria-selected on the focusable button itself", async () => {
      const user = userEvent.setup();
      renderPicker();
      const dialog = await openDialog(user);

      const selected = within(dialog).getByRole("gridcell", { selected: true });
      expect(selected.tagName).toBe("BUTTON");
      expect(selected).toHaveAttribute("aria-selected", "true");
      // On open the selected day is also the focused day — selection state now
      // lives on the element the screen reader actually lands on.
      expect(selected).toHaveFocus();

      await user.keyboard("{Escape}");
      finishCloseAnimation(dialog);
    });
  });

  // --- Spec 031: UI integration polish (U-01 … U-29) ---------------------

  describe("spec 031 — correctness (U-01 … U-07)", () => {
    it("U-01: opens on the EARLIEST month, not today's month", async () => {
      // today = 2026-06-29 (Mon) → earliest = 2026-07-02 (Thu). The dialog's
      // view-month must follow `committed`, which seeds from `earliest`.
      const user = userEvent.setup();
      renderPicker({ today: "2026-06-29" });
      const dialog = await openDialog(user);
      expect(within(dialog).getByText(/JULY 2026/i)).toBeInTheDocument();
      expect(within(dialog).queryByText(/JUNE 2026/i)).toBeNull();
      await user.keyboard("{Escape}");
      finishCloseAnimation(dialog);
    });

    it("U-02: re-opening after confirm shows the new committed month", async () => {
      // Confirm a July day, re-open, header must stay July.
      const user = userEvent.setup();
      renderPicker({ today: "2026-06-29" });
      const dialog = await openDialog(user);
      // earliest is 2026-07-02 (Thu). Pick that as the deliverable day.
      await user.click(screen.getByRole("button", { name: DEFAULT_DELIVERY_LABELS.confirm }));
      finishCloseAnimation(dialog);

      const reopened = await openDialog(user);
      expect(within(reopened).getByText(/JULY 2026/i)).toBeInTheDocument();
      await user.keyboard("{Escape}");
      finishCloseAnimation(reopened);
    });

    it("U-03: single-select invariant — clicking a deliverable day yields exactly one selected gridcell", async () => {
      const user = userEvent.setup();
      renderPicker();
      const dialog = await openDialog(user);

      // Wed 17 is the next deliverable day after the earliest (Mon 15).
      await user.click(within(dialog).getByRole("gridcell", { name: /^17/ }));
      const selected = within(dialog).getAllByRole("gridcell", { selected: true });
      expect(selected).toHaveLength(1);
      expect(selected[0].textContent).toContain(NEXT_DELIVERABLE_DAY);

      await user.keyboard("{Escape}");
      finishCloseAnimation(dialog);
    });

    it("U-04: caption flips back to Earliest delivery after re-confirming the earliest day", async () => {
      const user = userEvent.setup();
      renderPicker();

      // First: open, pick Wed 17, Confirm → caption swaps to "Delivery date".
      const firstDialog = await openDialog(user);
      await user.keyboard("{ArrowRight}{ArrowRight}{Enter}");
      await user.click(screen.getByRole("button", { name: DEFAULT_DELIVERY_LABELS.confirm }));
      finishCloseAnimation(firstDialog);
      expect(screen.getByText(DEFAULT_DELIVERY_LABELS.deliveryDate)).toBeInTheDocument();

      // Second: re-open, navigate back to Mon 15 (earliest), Confirm → caption
      // flips BACK to "Earliest delivery".
      const secondDialog = await openDialog(user);
      await user.keyboard("{ArrowLeft}{ArrowLeft}{Enter}");
      await user.click(screen.getByRole("button", { name: DEFAULT_DELIVERY_LABELS.confirm }));
      finishCloseAnimation(secondDialog);

      expect(screen.getByText(DEFAULT_DELIVERY_LABELS.earliestDelivery)).toBeInTheDocument();
      expect(screen.queryByText(DEFAULT_DELIVERY_LABELS.deliveryDate)).toBeNull();
    });

    it("U-05: modal is genuinely absent from DOM after close (no .sdp-modal or .sdp-backdrop nodes)", async () => {
      const user = userEvent.setup();
      const { container } = renderPicker();
      const dialog = await openDialog(user);
      await user.keyboard("{Escape}");
      finishCloseAnimation(dialog);

      expect(container.querySelectorAll(".sdp-modal, .sdp-backdrop")).toHaveLength(0);
    });

    it("U-06: controlled `value` is never shadowed by internal commit", async () => {
      // With `value` controlled, picking + confirming a different day must NOT
      // change the closed-card display until the parent updates `value`.
      const user = userEvent.setup();
      renderPicker({ value: "2026-06-15" });
      expect(screen.getByText(EARLIEST_DAY)).toBeInTheDocument();

      const dialog = await openDialog(user);
      await user.keyboard("{ArrowRight}{ArrowRight}{Enter}");
      await user.click(screen.getByRole("button", { name: DEFAULT_DELIVERY_LABELS.confirm }));
      finishCloseAnimation(dialog);

      // Closed card still reads 15 — the controlled prop is the only source.
      expect(screen.getByText(EARLIEST_DAY)).toBeInTheDocument();
      expect(screen.queryByText(NEXT_DELIVERABLE_DAY)).toBeNull();
    });

    it("U-07: `defaultValue` is honoured as the initial committed value (current contract)", () => {
      // Documents and locks the current contract: `defaultValue ?? earliest`
      // accepts the value as-is, with no blocked-day coercion. Flipping the
      // contract (clamp blocked defaults up to earliest) requires its own spec.
      renderPicker({ defaultValue: "2026-06-22" });
      expect(screen.getByText("22")).toBeInTheDocument();
    });
  });

  describe("spec 031 — focus wrap + Home/End (U-16 … U-19)", () => {
    it("U-16: Tab from the last focusable wraps to the first", async () => {
      const user = userEvent.setup();
      renderPicker();
      const dialog = await openDialog(user);
      unblockFocusableInJsdom(dialog);

      const confirm = screen.getByRole("button", { name: DEFAULT_DELIVERY_LABELS.confirm });
      confirm.focus();
      expect(confirm).toHaveFocus();
      await user.keyboard("{Tab}");
      // First focusable in the dialog is the currently-active gridcell button.
      const firstFocusable = within(dialog).getByRole("gridcell", { selected: true });
      expect(firstFocusable).toHaveFocus();

      await user.keyboard("{Escape}");
      finishCloseAnimation(dialog);
    });

    it("U-17: Shift+Tab from the first focusable wraps to the last", async () => {
      const user = userEvent.setup();
      renderPicker();
      const dialog = await openDialog(user);
      unblockFocusableInJsdom(dialog);

      const firstFocusable = within(dialog).getByRole("gridcell", { selected: true });
      firstFocusable.focus();
      expect(firstFocusable).toHaveFocus();
      await user.keyboard("{Shift>}{Tab}{/Shift}");
      const confirm = screen.getByRole("button", { name: DEFAULT_DELIVERY_LABELS.confirm });
      expect(confirm).toHaveFocus();

      await user.keyboard("{Escape}");
      finishCloseAnimation(dialog);
    });

    it("U-18: ESC threads through requestClose(false) and calls onOpenChange(false)", async () => {
      const onOpenChange = jest.fn();
      const user = userEvent.setup();
      renderPicker({ onOpenChange });
      const dialog = await openDialog(user);
      expect(onOpenChange).toHaveBeenLastCalledWith(true);

      await user.keyboard("{Escape}");
      expect(onOpenChange).toHaveBeenLastCalledWith(false);

      finishCloseAnimation(dialog);
    });

    it("U-19: Home moves the active cell to Monday of the row, End to Sunday", async () => {
      const user = userEvent.setup();
      renderPicker();
      const dialog = await openDialog(user);

      // earliest (active on open) = Mon 15. ArrowRight×2 → Wed 17.
      await user.keyboard("{ArrowRight}{ArrowRight}");
      // Home → row-start = Mon 15.
      await user.keyboard("{Home}");
      expect(document.activeElement?.textContent).toContain(EARLIEST_DAY);
      // End → row-end = Sun 21.
      await user.keyboard("{End}");
      expect(document.activeElement?.textContent).toContain("21");

      await user.keyboard("{Escape}");
      finishCloseAnimation(dialog);
    });
  });

  describe("spec 031 — UX state machine (U-20 … U-22, U-24 … U-26)", () => {
    it("U-20: data-state transitions open → closing → closed in order", async () => {
      const user = userEvent.setup();
      renderPicker();
      const dialog = await openDialog(user);
      expect(dialog.dataset.state).toBe("open");

      await user.keyboard("{Escape}");
      // After requestClose(false), still mounted and now `closing`.
      expect(screen.queryByRole("dialog")?.dataset.state).toBe("closing");

      finishCloseAnimation(dialog);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("U-21: backdrop carries data-state='closing' alongside the modal during exit", async () => {
      const user = userEvent.setup();
      const { container } = renderPicker();
      const dialog = await openDialog(user);

      await user.keyboard("{Escape}");
      const backdrop = container.querySelector(".sdp-backdrop") as HTMLElement;
      expect(backdrop).toBeTruthy();
      expect(backdrop.dataset.state).toBe("closing");
      expect(dialog.dataset.state).toBe("closing");

      finishCloseAnimation(dialog);
    });

    it("U-22: safety-net 320 ms timer unmounts the modal when animationend never fires", () => {
      jest.useFakeTimers();
      try {
        renderPicker();
        act(() => {
          fireEvent.click(screen.getByRole("button", { name: DEFAULT_DELIVERY_LABELS.change }));
        });
        const dialog = screen.getByRole("dialog");
        expect(dialog).toBeInTheDocument();

        act(() => {
          fireEvent.click(screen.getByRole("button", { name: DEFAULT_DELIVERY_LABELS.cancel }));
        });
        // "closing" — modal still mounted while the (un-fired) animation drains.
        expect(screen.queryByRole("dialog")).toBeInTheDocument();
        expect(screen.queryByRole("dialog")?.dataset.state).toBe("closing");

        act(() => {
          jest.advanceTimersByTime(320);
        });
        expect(screen.queryByRole("dialog")).toBeNull();
      } finally {
        jest.useRealTimers();
      }
    });

    it("U-24: Confirm fires onConfirm with the DRAFT, not the previously committed value", async () => {
      const onConfirm = jest.fn();
      const user = userEvent.setup();
      renderPicker({ onConfirm });
      const dialog = await openDialog(user);

      // Move draft to Wed 17 (not the committed 15) and Confirm.
      await user.keyboard("{ArrowRight}{ArrowRight}{Enter}");
      await user.click(screen.getByRole("button", { name: DEFAULT_DELIVERY_LABELS.confirm }));
      finishCloseAnimation(dialog);

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onConfirm).toHaveBeenCalledWith(NEXT_DELIVERABLE_ISO);
      // Importantly NOT the committed 2026-06-15.
      expect(onConfirm).not.toHaveBeenCalledWith("2026-06-15");
    });

    it("U-25: closed-card day number flips to the new committed day after Confirm", async () => {
      const user = userEvent.setup();
      renderPicker();
      const dialog = await openDialog(user);

      await user.keyboard("{ArrowRight}{ArrowRight}{Enter}");
      await user.click(screen.getByRole("button", { name: DEFAULT_DELIVERY_LABELS.confirm }));
      finishCloseAnimation(dialog);

      expect(screen.getByText(NEXT_DELIVERABLE_DAY)).toBeInTheDocument();
      expect(screen.queryByText(EARLIEST_DAY)).toBeNull();
    });

    it("U-26: caption swaps from 'Earliest delivery' to 'Delivery date' on Confirming a later day", async () => {
      const user = userEvent.setup();
      renderPicker();
      // Pre-condition: caption reads "Earliest delivery".
      expect(screen.getByText(DEFAULT_DELIVERY_LABELS.earliestDelivery)).toBeInTheDocument();

      const dialog = await openDialog(user);
      await user.keyboard("{ArrowRight}{ArrowRight}{Enter}");
      await user.click(screen.getByRole("button", { name: DEFAULT_DELIVERY_LABELS.confirm }));
      finishCloseAnimation(dialog);

      expect(screen.getByText(DEFAULT_DELIVERY_LABELS.deliveryDate)).toBeInTheDocument();
      expect(screen.queryByText(DEFAULT_DELIVERY_LABELS.earliestDelivery)).toBeNull();
    });
  });

  describe("spec 031 — theming parity (U-27 … U-29)", () => {
    function gridcellsByTheme(theme: typeof sorrelTheme) {
      const { container, unmount } = render(<DeliveryDatePicker today={TODAY} theme={theme} />);
      const change = within(container).getByRole("button", {
        name: DEFAULT_DELIVERY_LABELS.change,
      });
      fireEvent.click(change);
      const dialog = within(container).getByRole("dialog");
      const cells = within(dialog).getAllByRole("gridcell");
      const blocked = cells
        .filter((c) => c.getAttribute("aria-disabled") === "true")
        .map((c) => c.textContent ?? "");
      const selected = cells
        .filter((c) => c.getAttribute("aria-selected") === "true")
        .map((c) => c.textContent ?? "");
      const totalCells = cells.length;
      return { blocked, selected, totalCells, unmount, dialog, container };
    }

    it("U-27: both themes render the same DOM + ARIA structure under identical inputs", () => {
      const sorrel = gridcellsByTheme(sorrelTheme);
      const bramble = gridcellsByTheme(brambleTheme);

      expect(sorrel.totalCells).toBe(bramble.totalCells);
      expect(sorrel.selected).toEqual(bramble.selected);
      expect(sorrel.selected).toHaveLength(1);

      sorrel.unmount();
      bramble.unmount();
    });

    it("U-28: blocked gridcell set is identical under both themes", () => {
      const sorrel = gridcellsByTheme(sorrelTheme);
      const bramble = gridcellsByTheme(brambleTheme);

      expect(sorrel.blocked).toEqual(bramble.blocked);
      // Sanity: 2026-06 has blocked Tue/Fri/Sat after the earliest plus the
      // before-earliest days. The exact count is not the contract here; the
      // contract is "the same set under both themes".
      expect(sorrel.blocked.length).toBeGreaterThan(0);

      sorrel.unmount();
      bramble.unmount();
    });

    it("U-29: both theme objects satisfy DeliveryTheme without `as` (compile-checked)", () => {
      // The structural compile-check module at
      // ./theme/__type-checks__/DeliveryTheme.types.ts asserts both themes are
      // assignable to DeliveryTheme without widening. If a token key is added
      // to DeliveryTheme but missing from either theme object, `yarn type-check`
      // fails before this test runs. The runtime assertion confirms the
      // type-check file is loaded and its exports are the theme objects — a
      // delete of the file (which would silently defeat the type-check) would
      // fail to compile here.
      expect(DELIVERY_THEME_STRUCTURAL_CHECK_SORREL).toBe(sorrelTheme);
      expect(DELIVERY_THEME_STRUCTURAL_CHECK_BRAMBLE).toBe(brambleTheme);
    });
  });

  describe("live-region announcements (spec 025 R3)", () => {
    it("announces the selection when arrowing onto a deliverable day", async () => {
      const user = userEvent.setup();
      renderPicker();
      const dialog = await openDialog(user);
      const status = within(dialog).getByRole("status");
      expect(status).toBeEmptyDOMElement();

      // 15 (Mon) → 16 (Tue, blocked: clears) → 17 (Wed, deliverable: announces).
      await user.keyboard("{ArrowRight}");
      expect(status).toBeEmptyDOMElement();
      await user.keyboard("{ArrowRight}");
      expect(status).toHaveTextContent("Delivery set to Wednesday 17 June");

      await user.keyboard("{Escape}");
      finishCloseAnimation(dialog);
    });

    it("announces the localised reason when a blocked day is clicked", async () => {
      const user = userEvent.setup();
      renderPicker();
      const dialog = await openDialog(user);

      await user.click(within(dialog).getByRole("gridcell", { name: BLOCKED_FRIDAY_LABEL }));
      expect(within(dialog).getByRole("status")).toHaveTextContent("No deliveries on Fridays");

      await user.keyboard("{Escape}");
      finishCloseAnimation(dialog);
    });

    it("announces the localised reason on Enter over a blocked active cell", async () => {
      const user = userEvent.setup();
      renderPicker();
      const dialog = await openDialog(user);

      // 15 → ArrowRight → active = 16 (Tue, blocked); Enter echoes the reason.
      await user.keyboard("{ArrowRight}{Enter}");
      expect(within(dialog).getByRole("status")).toHaveTextContent("No deliveries on Tuesdays");

      await user.keyboard("{Escape}");
      finishCloseAnimation(dialog);
    });
  });
});
