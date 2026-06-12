# @sorrel/ui

Shared UI for the Sorrel funnel. Home of the **delivery date picker** — the Tier-1
centerpiece and the design-system proof: one component, two brand skins.

Built from the Claude Design handoff (`Sorrel Funnel.dc.html`); see
[`specs/001-delivery-date-picker.md`](../../specs/001-delivery-date-picker.md).

## Delivery date picker

```tsx
import { DeliveryDatePicker, sorrelTheme, brambleTheme } from "@sorrel/ui";

// Sorrel (cat) — the default skin
<DeliveryDatePicker today="2026-06-12" onConfirm={(iso) => save(iso)} />

// Bramble (dog) — same component, only tokens change
<DeliveryDatePicker today="2026-06-12" theme={brambleTheme} />
```

- **Closed card** — earliest deliverable day, free-delivery pill, calendar icon with a
  dynamic day number, and a Change affordance.
- **Modal** — Monday-first month grid; Tuesdays / Fridays / Saturdays and days before the
  earliest are shown but `aria-disabled` with a reason; single selection; Cancel / Confirm.
- **Accessibility** — focus trap, ESC, return-focus to Change, `aria-modal`, `role="grid"`,
  roving tabindex (arrows + Home/End), and a `prefers-reduced-motion` fallback.
- **Animation** — three-state machine (open → closing → closed); the modal unmounts on
  `animationend` so a removed node has nothing left to paint.

The date math lives in [`@sorrel/domain`](../domain) (`delivery/calendar.ts`) and is unit-tested
across month boundaries; the component is the view layer over it.
