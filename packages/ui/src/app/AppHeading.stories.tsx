import type { Meta, StoryObj } from "@storybook/react";

import { AppHeading } from "./components";

const meta: Meta<typeof AppHeading> = {
  title: "App*/AppHeading",
  component: AppHeading,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof AppHeading>;

export const Level1: Story = { args: { level: 1, children: "Heading level 1" } };
export const Level2: Story = { args: { level: 2, children: "Heading level 2" } };
export const Level3: Story = { args: { level: 3, children: "Heading level 3" } };

export const LargeFontSize: Story = {
  args: { level: 2, fontSize: "2.5rem", children: "Heading w/ explicit fontSize" },
};
