"use client";

import { storyblokEditable } from "@storyblok/react/rsc";

import { AppBand, AppGrid, AppHeading, AppStack, AppText, sorrelTheme } from "@sorrel/ui";

import type { TestimonialSectionBlok } from "../../types/storyblok.gen";

export function TestimonialSection({ blok }: { blok: TestimonialSectionBlok }) {
  return (
    <AppBand tone="page" editable={storyblokEditable(blok)}>
      <AppStack gap={{ xs: 1.75, md: 3.5 }} py={{ xs: 5.5, md: 8 }}>
        <AppText variant="overline" color={sorrelTheme.mono} fontSize={{ xs: 11, md: 12 }}>
          {blok.eyebrow}
        </AppText>
        <AppGrid columns={{ xs: "1fr", md: "1fr 1fr" }} gap={{ xs: 4, md: 7 }}>
          {blok.items?.map((item) => (
            <AppStack
              key={item._uid}
              component="figure"
              m={0}
              gap={1.75}
              editable={storyblokEditable(item)}
            >
              <AppHeading
                level={3}
                component="blockquote"
                fontSize={{ xs: 21, md: 24 }}
                lineHeight={1.4}
                color="text.primary"
                textWrap="pretty"
              >
                &ldquo;{item.quote}&rdquo;
              </AppHeading>
              <AppText
                component="figcaption"
                variant="overline"
                fontSize={11}
                color={sorrelTheme.mono}
              >
                {item.attribution}
              </AppText>
            </AppStack>
          ))}
        </AppGrid>
      </AppStack>
    </AppBand>
  );
}
