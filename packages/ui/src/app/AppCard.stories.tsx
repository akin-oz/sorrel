import type { Meta, StoryObj } from "@storybook/react";

import { AppCard, AppHeading, AppText } from "./components";
import { AppStack } from "./primitives";

const meta: Meta<typeof AppCard> = {
  title: "App*/AppCard",
  component: AppCard,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof AppCard>;

const sample = (
  <AppStack gap={1}>
    <AppHeading level={3}>Card title</AppHeading>
    <AppText>Body copy inside the surface. Inks resolve from MUI theme tokens.</AppText>
  </AppStack>
);

export const Default: Story = { args: { children: sample } };
export const ToneSurface: Story = { args: { tone: "surface", children: sample } };
export const ToneAccentTint: Story = { args: { tone: "accentTint", children: sample } };
export const ToneAccent: Story = { args: { tone: "accent", children: sample } };
export const ToneInk: Story = { args: { tone: "ink", children: sample } };
export const ShadowOn: Story = { args: { shadow: true, children: sample } };
export const Borderless: Story = { args: { border: false, children: sample } };
export const RowDirection: Story = {
  args: {
    direction: "row",
    gap: 2,
    children: (
      <>
        <AppText>Left</AppText>
        <AppText>Right</AppText>
      </>
    ),
  },
};
