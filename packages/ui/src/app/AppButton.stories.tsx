import { useRef } from "react";

import type { Meta, StoryObj } from "@storybook/react";

import { AppButton } from "./components";

const meta: Meta<typeof AppButton> = {
  title: "App*/AppButton",
  component: AppButton,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof AppButton>;

export const Contained: Story = {
  args: { variant: "contained", children: "Continue" },
};
export const Outlined: Story = {
  args: { variant: "outlined", children: "Cancel" },
};
export const Text: Story = {
  args: { variant: "text", children: "Save & exit" },
};
export const Large: Story = {
  args: { variant: "contained", size: "large", children: "Continue (large)" },
};
export const Disabled: Story = {
  args: { variant: "contained", disabled: true, children: "Continue (disabled)" },
};

export const WithRef: Story = {
  render: function RefSmoke(args) {
    const ref = useRef<HTMLButtonElement>(null);
    return <AppButton ref={ref} {...args} />;
  },
  args: { variant: "contained", children: "With ref" },
};
