"use client";

import { storyblokEditable } from "@storyblok/react/rsc";
import NextImage from "next/image";

import {
  AppBand,
  AppBox,
  AppButton,
  AppGrid,
  AppHeading,
  AppImage,
  AppStack,
  AppText,
  appTokens,
  sorrelTheme,
} from "@sorrel/ui";

import { Link } from "../../i18n/navigation";
import type { HeroBlok } from "../../types/storyblok.gen";
import { STRIPED_PLACEHOLDER } from "./placeholder";

export function Hero({ blok }: { blok: HeroBlok }) {
  return (
    <AppBand tone="paper" editable={storyblokEditable(blok)}>
      <AppGrid
        columns={{ xs: "1fr", md: "1.05fr 1fr" }}
        gap={{ xs: 3, md: 7 }}
        alignItems="center"
        py={{ xs: 4.5, md: 9 }}
      >
        <AppStack gap={{ xs: 1.5, md: 2.5 }}>
          {blok.eyebrow ? (
            <AppText variant="overline" color={sorrelTheme.mono} fontSize={{ xs: 11, md: 12 }}>
              {blok.eyebrow}
            </AppText>
          ) : null}
          <AppHeading
            level={1}
            fontSize={{ xs: 34, md: 52 }}
            lineHeight={{ xs: 1.12, md: 1.08 }}
            textWrap="pretty"
          >
            {blok.headline}
          </AppHeading>
          <AppText
            color="text.secondary"
            fontSize={{ xs: 15, md: 17 }}
            lineHeight={1.6}
            maxWidth="29rem"
          >
            {blok.subcopy}
          </AppText>
          <AppStack gap={1.5} alignItems={{ xs: "stretch", md: "flex-start" }} mt={0.5}>
            <AppButton
              component={Link}
              href={blok.ctaHref || "/wizard/cats"}
              variant="contained"
              size="large"
            >
              {blok.ctaLabel}
            </AppButton>
            {blok.reassurance ? (
              <AppBox textAlign={{ xs: "center", md: "left" }}>
                <AppText variant="body2" color="text.secondary" fontSize={{ xs: 13, md: 14 }}>
                  {blok.reassurance}
                </AppText>
              </AppBox>
            ) : null}
          </AppStack>
        </AppStack>
        <AppImage
          src={blok.image?.filename}
          alt={blok.image?.alt ?? ""}
          height={{ xs: 250, md: 440 }}
          radius={{ xs: `${appTokens.radius.surface}px`, md: `${appTokens.radius.shell}px` }}
          fallbackBackground={STRIPED_PLACEHOLDER}
          imageComponent={NextImage}
          intrinsicWidth={1120}
          intrinsicHeight={880}
        />
      </AppGrid>
    </AppBand>
  );
}
