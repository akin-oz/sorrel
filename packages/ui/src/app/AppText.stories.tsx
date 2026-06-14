import type { Meta, StoryObj } from "@storybook/react";

import { AppText } from "./components";

const meta: Meta<typeof AppText> = {
  title: "App*/AppText",
  component: AppText,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof AppText>;

export const Body1: Story = {
  args: { variant: "body1", children: "Body 1 — the funnel's default running copy." },
};
export const Body2: Story = {
  args: { variant: "body2", children: "Body 2 — caption / supporting copy." },
};
export const Overline: Story = {
  args: { variant: "overline", children: "OVERLINE — step labels, monospace accent" },
};
export const Caption: Story = {
  args: { variant: "caption", children: "Caption — smallest tier." },
};
export const Bold: Story = {
  args: { variant: "body1", fontWeight: 700, children: "Bold body 1." },
};
