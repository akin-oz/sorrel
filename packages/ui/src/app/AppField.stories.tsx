import type { Meta, StoryObj } from "@storybook/react";

import { AppField } from "./components";

const meta: Meta<typeof AppField> = {
  title: "App*/AppField",
  component: AppField,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof AppField>;

export const TextInput: Story = {
  args: { label: "Cat's name", placeholder: "Whiskers", fullWidth: true },
};

export const Email: Story = {
  args: { label: "Email address", type: "email", placeholder: "you@example.com", fullWidth: true },
};

export const Errored: Story = {
  args: {
    label: "Email address",
    type: "email",
    value: "not-an-email",
    error: true,
    helperText: "That doesn't look like a valid email address.",
    fullWidth: true,
  },
};

export const SelectField: Story = {
  args: {
    label: "Age",
    select: true,
    value: "adult",
    options: [
      { value: "kitten", label: "Under 1 year" },
      { value: "young", label: "1–3 years" },
      { value: "adult", label: "3–7 years" },
      { value: "senior", label: "7+ years" },
    ],
    fullWidth: true,
  },
};
