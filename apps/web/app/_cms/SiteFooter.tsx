"use client";

import { storyblokEditable } from "@storyblok/react/rsc";

import {
  AppBand,
  AppBox,
  AppGrid,
  AppHeading,
  AppLink,
  AppStack,
  AppText,
  BrandLogo,
  sorrelTheme,
} from "@sorrel/ui";

import { Link } from "../../i18n/navigation";
import type { FooterLinkBlok, SiteFooterBlok } from "../../types/storyblok.gen";

/** Anchors and routes link; entries without an href stay plain text (no ghost routes). */
function FooterEntry({ blok }: { blok: FooterLinkBlok }) {
  if (!blok.href) {
    return (
      <AppText fontSize={14} color={sorrelTheme.dayMuted} editable={storyblokEditable(blok)}>
        {blok.label}
      </AppText>
    );
  }
  return (
    <AppLink
      href={blok.href}
      component={blok.href.startsWith("#") ? "a" : Link}
      color={sorrelTheme.dayMuted}
      underline="hover"
      width="fit-content"
      editable={storyblokEditable(blok)}
    >
      {blok.label}
    </AppLink>
  );
}

export function SiteFooter({ blok }: { blok: SiteFooterBlok }) {
  return (
    <AppBand component="footer" tone="ink" editable={storyblokEditable(blok)}>
      <AppStack pt={{ xs: 5, md: 7 }} pb={3.5} gap={{ xs: 3.5, md: 4.5 }}>
        <AppStack
          direction={{ xs: "column", md: "row" }}
          justifyContent={{ md: "space-between" }}
          alignItems={{ md: "flex-start" }}
          gap={{ xs: 3.5, md: 6 }}
        >
          <AppBox display="flex" alignItems="center" gap={1}>
            <BrandLogo size={22} color={sorrelTheme.onAccent} />
            <AppHeading
              level={3}
              component="span"
              fontWeight={700}
              fontSize={{ xs: 20, md: 22 }}
              color={sorrelTheme.onAccent}
            >
              Sorrel
            </AppHeading>
          </AppBox>
          <AppGrid columns={{ xs: "1fr 1fr", md: "repeat(3, 160px)" }} gap={3}>
            {blok.columns?.map((column) => (
              <AppStack key={column._uid} gap={1.25} editable={storyblokEditable(column)}>
                <AppText variant="overline" fontSize={10.5} color={sorrelTheme.mono}>
                  {column.heading}
                </AppText>
                {column.links?.map((link) => (
                  <FooterEntry key={link._uid} blok={link} />
                ))}
              </AppStack>
            ))}
          </AppGrid>
        </AppStack>
        <AppText fontSize={12.5} lineHeight={1.5} color={sorrelTheme.mono}>
          {blok.legal}
        </AppText>
      </AppStack>
    </AppBand>
  );
}
