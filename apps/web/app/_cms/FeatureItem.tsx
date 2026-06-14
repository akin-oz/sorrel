"use client";

import { storyblokEditable } from "@storyblok/react/rsc";

import { AppCard, AppStack, AppText, sorrelTheme } from "@sorrel/ui";

import type { FeatureIcon, FeatureItemBlok } from "../../types/storyblok.gen";

/** Decorative token-built glyphs (spec 012/018) — simple inline-SVG shapes. */
function Glyph({ icon }: { icon: FeatureIcon }) {
  if (icon === "vet") {
    // Tinted circle with a solid centre dot.
    return (
      <svg width={40} height={40} viewBox="0 0 40 40" aria-hidden>
        <circle cx={20} cy={20} r={20} fill={sorrelTheme.accentTint} />
        <circle cx={20} cy={20} r={7} fill={sorrelTheme.accent} />
      </svg>
    );
  }
  if (icon === "portion") {
    // Tinted rotated square with a solid centre square.
    return (
      <svg width={40} height={40} viewBox="0 0 40 40" aria-hidden>
        <rect
          x={20}
          y={3}
          width={24}
          height={24}
          fill={sorrelTheme.accentTint}
          transform="rotate(45 20 20)"
        />
        <rect
          x={20}
          y={13}
          width={10}
          height={10}
          fill={sorrelTheme.accent}
          transform="rotate(45 20 20)"
        />
      </svg>
    );
  }
  // Bowl: tinted dome over a solid bar, bottom-aligned.
  return (
    <svg width={40} height={40} viewBox="0 0 40 40" aria-hidden>
      <path d="M4 35 a16 16 0 0 1 32 0 Z" fill={sorrelTheme.accentTint} />
      <rect x={4} y={37} width={32} height={5} rx={2} fill={sorrelTheme.accent} />
    </svg>
  );
}

export function FeatureItem({ blok }: { blok: FeatureItemBlok }) {
  return (
    <AppCard
      tone="surface"
      radius="16px"
      padding={{ xs: 2.25, md: 3.25 }}
      direction={{ xs: "row", md: "column" }}
      alignItems="flex-start"
      gap={1.75}
      editable={storyblokEditable(blok)}
    >
      {blok.icon ? <Glyph icon={blok.icon} /> : null}
      <AppStack gap={0.5}>
        <AppText fontWeight={600} color="text.primary" fontSize={{ xs: 16, md: 17 }}>
          {blok.title}
        </AppText>
        <AppText
          variant="body2"
          color="text.secondary"
          fontSize={{ xs: 14, md: 15 }}
          lineHeight={1.55}
        >
          {blok.body}
        </AppText>
      </AppStack>
    </AppCard>
  );
}
