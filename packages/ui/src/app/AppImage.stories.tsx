import type { Meta, StoryObj } from "@storybook/react";

import { AppImage } from "./components";

const meta: Meta<typeof AppImage> = {
  title: "App*/AppImage",
  component: AppImage,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof AppImage>;

export const PlaceholderFallback: Story = {
  args: {
    alt: "Decorative placeholder",
    height: 200,
    radius: "12px",
    fallbackBackground:
      "repeating-linear-gradient(45deg,#F1E7D9,#F1E7D9 10px,#EBDFCE 10px,#EBDFCE 20px)",
  },
};

export const PlainImg: Story = {
  args: {
    src: "https://a2.storyblok.com/f/123456/1120x880/abc/hero.jpg",
    alt: "A tasty bowl of cat food",
    height: 200,
    radius: "12px",
  },
};

/** Demonstrates the imageComponent injection seam without importing next/image.
 *  The injected stub adds `loading="lazy"` and respects the intrinsic dimensions
 *  for layout reservation — the same contract next/image satisfies in apps/web. */
export const WithImageComponent: Story = {
  args: {
    src: "https://a2.storyblok.com/f/123456/1120x880/abc/hero.jpg",
    alt: "A tasty bowl of cat food",
    height: 200,
    radius: "12px",
    intrinsicWidth: 1120,
    intrinsicHeight: 880,
    imageComponent: function StubImage({ src, alt, width, height }) {
      return <img src={src} alt={alt} width={width} height={height} loading="lazy" />;
    },
  },
};
