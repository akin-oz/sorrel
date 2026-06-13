import type { MetadataRoute } from "next";

import { SITE_URL } from "../lib/site";

/** robots.txt (spec 015): index everything public, keep crawlers out of the API. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
