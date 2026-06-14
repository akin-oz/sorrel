import type { Meta, StoryObj } from "@storybook/react";

import { BrandLogo } from "./BrandLogo";
import { brambleTheme, sorrelTheme } from "./theme/tokens";

const meta: Meta<typeof BrandLogo> = {
  title: "Primitives/BrandLogo",
  component: BrandLogo,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof BrandLogo>;

export const Default: Story = {
  args: { size: 48, title: "Sorrel" },
};

export const Sorrel: Story = {
  args: { size: 64, color: sorrelTheme.accent, title: "Sorrel" },
};

export const Bramble: Story = {
  args: { size: 64, color: brambleTheme.accent, title: "Bramble" },
};

export const Decorative: Story = {
  args: { size: 32 },
};
