import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react";

import { AppHeading, AppToggleGroup, AppToggleOption } from "./components";

const meta: Meta<typeof AppToggleGroup> = {
  title: "App*/AppToggleGroup",
  component: AppToggleGroup,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof AppToggleGroup>;

function PillsExample() {
  const [value, setValue] = useState<string | null>("adult");
  return (
    <AppToggleGroup
      layout="pills"
      value={value}
      onChange={(_e, next) => {
        if (typeof next === "string") setValue(next);
      }}
      aria-label="Age"
    >
      <AppToggleOption value="kitten">Under 1 year</AppToggleOption>
      <AppToggleOption value="young">1–3 years</AppToggleOption>
      <AppToggleOption value="adult">3–7 years</AppToggleOption>
      <AppToggleOption value="senior">7+ years</AppToggleOption>
    </AppToggleGroup>
  );
}

function CardsExample() {
  const [count, setCount] = useState<number | null>(1);
  return (
    <AppToggleGroup
      layout="cards"
      columns={{ xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }}
      value={count}
      onChange={(_e, next) => {
        if (typeof next === "number") setCount(next);
      }}
      aria-label="Number of cats"
    >
      {[1, 2, 3, 4].map((n) => (
        <AppToggleOption key={n} value={n} aria-label={`${n} cat${n === 1 ? "" : "s"}`}>
          <AppHeading level={3} component="span" fontSize="1.5rem">
            {n === 4 ? "4+" : n}
          </AppHeading>
        </AppToggleOption>
      ))}
    </AppToggleGroup>
  );
}

function SegmentedExample() {
  const [freq, setFreq] = useState<string | null>("EVERY_4_WEEKS");
  return (
    <AppToggleGroup
      layout="segmented"
      value={freq}
      onChange={(_e, next) => {
        if (typeof next === "string") setFreq(next);
      }}
      aria-label="Delivery frequency"
    >
      <AppToggleOption value="EVERY_2_WEEKS">Every 2 weeks</AppToggleOption>
      <AppToggleOption value="EVERY_4_WEEKS">Every 4 weeks</AppToggleOption>
    </AppToggleGroup>
  );
}

export const Pills: Story = { render: () => <PillsExample /> };
export const Cards: Story = { render: () => <CardsExample /> };
export const Segmented: Story = { render: () => <SegmentedExample /> };
