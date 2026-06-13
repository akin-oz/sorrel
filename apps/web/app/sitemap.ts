import type { MetadataRoute } from "next";

import { SITE_URL } from "../lib/site";

/**
 * Sitemap with hreflang alternates (spec 015). en is unprefixed, de is /de
 * (localePrefix: "as-needed"), so each entry advertises both language URLs.
 */
const PATHS = [
  { path: "", priority: 1 },
  { path: "/wizard/cats", priority: 0.8 },
  { path: "/insights", priority: 0.5 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map(({ path, priority }) => {
    const en = `${SITE_URL}${path}`;
    const de = `${SITE_URL}/de${path}`;
    return {
      url: en,
      changeFrequency: "weekly",
      priority,
      alternates: { languages: { en, de } },
    };
  });
}
