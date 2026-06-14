"use client";

import { storyblokEditable } from "@storyblok/react/rsc";

import { AppBand, AppButton, AppHeading, AppLink, AppStack, BrandLogo } from "@sorrel/ui";

import { Link } from "../../i18n/navigation";
import type { SiteNavBlok } from "../../types/storyblok.gen";
import { LocaleSwitcher } from "../_components/LocaleSwitcher";

export function SiteNav({ blok }: { blok: SiteNavBlok }) {
  return (
    <AppBand component="header" editable={storyblokEditable(blok)} tone="paper" borderBottom>
      <AppStack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        minHeight={{ xs: 64, md: 76 }}
      >
        <AppLink
          href="/"
          component={Link}
          color="primary.main"
          display="inline-flex"
          alignItems="center"
          gap={{ xs: 1, md: 1.25 }}
        >
          <BrandLogo size={24} />
          <AppHeading
            level={3}
            component="span"
            fontWeight={700}
            fontSize={{ xs: 21, md: 24 }}
            color="text.primary"
          >
            Sorrel
          </AppHeading>
        </AppLink>
        <AppStack direction="row" alignItems="center" gap={{ xs: 1, md: 1.5 }}>
          <LocaleSwitcher />
          <AppButton component={Link} href={blok.ctaHref || "/wizard/cats"} variant="contained">
            {blok.ctaLabel}
          </AppButton>
        </AppStack>
      </AppStack>
    </AppBand>
  );
}
