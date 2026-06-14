"use client";

import { storyblokEditable } from "@storyblok/react/rsc";

import { AppBand, AppGrid, AppHeading, AppStack, AppText, sorrelTheme } from "@sorrel/ui";

import type { HowItWorksBlok, HowStepBlok } from "../../types/storyblok.gen";

function Step({ blok, index }: { blok: HowStepBlok; index: number }) {
  return (
    <AppStack
      direction={{ xs: "row", md: "column" }}
      gap={{ xs: 2.25, md: 1.5 }}
      alignItems="flex-start"
      editable={storyblokEditable(blok)}
    >
      <AppHeading
        level={3}
        component="span"
        aria-hidden
        fontSize={{ xs: 40, md: 58 }}
        lineHeight={1}
        fontWeight={700}
        color="primary.main"
      >
        {index + 1}
      </AppHeading>
      <AppStack gap={0.5} pt={{ xs: 0.5, md: 0 }}>
        <AppText fontWeight={600} color="text.primary" fontSize={{ xs: 16, md: 18 }}>
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
    </AppStack>
  );
}

export function HowItWorks({ blok }: { blok: HowItWorksBlok }) {
  return (
    <AppBand tone="page" editable={storyblokEditable(blok)}>
      <AppStack gap={{ xs: 3, md: 4.5 }} py={{ xs: 5.5, md: 9 }}>
        <AppStack gap={{ xs: 0.75, md: 1 }}>
          <AppText variant="overline" color={sorrelTheme.mono} fontSize={{ xs: 11, md: 12 }}>
            {blok.eyebrow}
          </AppText>
          <AppHeading level={2} fontSize={{ xs: 24, md: 32 }}>
            {blok.heading}
          </AppHeading>
        </AppStack>
        <AppGrid columns={{ xs: "1fr", md: "1fr 1fr 1fr" }} gap={{ xs: 2.75, md: 5.5 }}>
          {blok.steps?.map((step, i) => (
            <Step key={step._uid} blok={step} index={i} />
          ))}
        </AppGrid>
      </AppStack>
    </AppBand>
  );
}
