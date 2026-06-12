import { defineRouting } from "next-intl/routing";

/** en (default, unprefixed) + de. The funnel and CMS content both localise to these. */
export const routing = defineRouting({
  locales: ["en", "de"],
  defaultLocale: "en",
  // en keeps clean URLs (/, /wizard/cats); only de is prefixed (/de/...).
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
