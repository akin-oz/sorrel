import type { ComponentProps } from "react";

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";

import { DEFAULT_DELIVERY_LABELS, DeliveryDatePicker } from "./DeliveryDatePicker";

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

      const someCell = within(dialog)
        .getAllByRole("button")
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

      await user.click(within(dialog).getByRole("button", { name: BLOCKED_FRIDAY_LABEL }));
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
});
