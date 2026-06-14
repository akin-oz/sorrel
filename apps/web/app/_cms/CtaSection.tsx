"use client";

import { storyblokEditable } from "@storyblok/react/rsc";

import {
  AppBand,
  AppBox,
  AppButton,
  AppHeading,
  AppStack,
  AppText,
  BrandLogo,
  sorrelTheme,
} from "@sorrel/ui";

import { Link } from "../../i18n/navigation";
import type { CtaSectionBlok } from "../../types/storyblok.gen";

export function CtaSection({ blok }: { blok: CtaSectionBlok }) {
  return (
    <AppBand editable={storyblokEditable(blok)} tone="accent" maxWidth={720}>
      <AppStack
        py={{ xs: 6.5, md: 11 }}
        alignItems="center"
        gap={{ xs: 2, md: 2.25 }}
        textAlign="center"
      >
        <BrandLogo size={32} color={sorrelTheme.onAccent} />
        <AppHeading
          level={2}
          color={sorrelTheme.onAccent}
          fontSize={{ xs: 27, md: 38 }}
          lineHeight={{ xs: 1.2, md: 1.15 }}
          maxWidth="28rem"
          textWrap="pretty"
        >
          {blok.heading}
        </AppHeading>
        {blok.subcopy ? (
          <AppText color={sorrelTheme.accentTint} fontSize={{ xs: 15, md: 16 }}>
            {blok.subcopy}
          </AppText>
        ) : null}
        <AppBox alignSelf={{ xs: "stretch", md: "center" }} mt={{ xs: 0.75, md: 1 }}>
          <AppButton
            component={Link}
            href={blok.ctaHref || "/wizard/cats"}
            variant="contained"
            size="large"
            inverted
            fullWidth
          >
            {blok.ctaLabel}
          </AppButton>
        </AppBox>
      </AppStack>
    </AppBand>
  );
}
