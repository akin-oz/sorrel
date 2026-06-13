/**
 * Canonical site origin, shared by metadata, sitemap, robots, and JSON-LD so
 * they can never drift. `NEXT_PUBLIC_SITE_URL` overrides for a custom domain;
 * otherwise the production deploy. Trailing slash stripped for clean joins.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sorrel.akinoztorun.dev"
).replace(/\/$/, "");
