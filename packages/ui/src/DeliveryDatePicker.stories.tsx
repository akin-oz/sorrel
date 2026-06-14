import type { Meta, StoryObj } from "@storybook/react";

import { DeliveryDatePicker } from "./DeliveryDatePicker";
import { brambleTheme } from "./theme/tokens";

/**
 * Spec 038 — centerpiece stories. The brand-skin toolbar (Sorrel ↔ Bramble)
 * in the preview decorator flips every story; these stories exercise the
 * other prop axes of `DeliveryDatePickerProps`.
 */

const meta: Meta<typeof DeliveryDatePicker> = {
  title: "Centerpiece/DeliveryDatePicker",
  component: DeliveryDatePicker,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof DeliveryDatePicker>;

export const Default: Story = {
  args: { today: "2026-06-12" },
};

export const Bramble: Story = {
  args: { today: "2026-06-12", theme: brambleTheme },
};

export const Controlled: Story = {
  args: { today: "2026-06-12", value: "2026-06-17" },
};

export const CustomToday: Story = {
  args: { today: "2026-06-20" },
};

export const ExtendedLead: Story = {
  args: { today: "2026-06-12", leadDays: 5 },
};

export const German: Story = {
  args: {
    today: "2026-06-12",
    locale: "de-DE",
    labels: {
      dialogTitle: "Liefertag wählen",
      cancel: "Abbrechen",
      confirm: "Bestätigen",
      change: "Ändern",
      earliestDelivery: "Frühste Lieferung",
      deliveryDate: "Lieferdatum",
      freeDelivery: "Kostenlose Lieferung",
      blockedWeekday: (weekday) => `Keine Lieferung am ${weekday}`,
      beforeEarliest: (date) => `Frühste Lieferung am ${date}`,
    },
  },
};
