/**
 * Absolute URL of the co-located GraphQL Route Handler, for server-side fetches
 * (RSC has no relative base). On Vercel `VERCEL_URL` is set per deployment;
 * `NEXT_PUBLIC_SITE_URL` overrides for a stable custom domain; otherwise local dev.
 */
export function graphqlEndpoint(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
  return `${base}/api/graphql`;
}
