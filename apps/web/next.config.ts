import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { join } from "node:path";

// Monorepo root, two levels up from apps/web.
const monorepoRoot = join(import.meta.dirname, "..", "..");

// Spec 041 §3: security headers + CSP (report-only on first deploy). The CSP
// allowlists every cross-origin the funnel needs — Stripe (Elements iframe +
// API), PostHog ingestion, Mixpanel ingestion, Storyblok (Visual Editor iframe
// frame-ancestors + CDN/asset hosts). Promote to enforcing after a preview
// walk confirms no console violations.
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com https://*.i.posthog.com",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://*.i.posthog.com https://api-eu.mixpanel.com https://js.stripe.com https://api.stripe.com https://app.storyblok.com https://a.storyblok.com https://api.storyblok.com",
  "img-src 'self' data: https: blob:",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "frame-ancestors 'self' https://app.storyblok.com",
  "font-src 'self' data:",
].join("; ");

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Workspace packages ship TS/TSX source (main -> src/index.ts), so Next must
  // transpile them rather than treat them as pre-built node_modules. @sorrel/api
  // (+ its @sorrel/domain dependency) back the co-located GraphQL Route Handler.
  transpilePackages: [
    "@sorrel/ui",
    "@sorrel/analytics",
    "@sorrel/shared",
    "@sorrel/api",
    "@sorrel/domain",
  ],
  // In a workspace the trace root is the monorepo, not apps/web.
  outputFileTracingRoot: monorepoRoot,
  // The GraphQL Route Handler reads schema.graphql (the contract root) at runtime;
  // make sure it ships in that function's serverless bundle.
  outputFileTracingIncludes: {
    "/api/graphql": ["../../schema.graphql"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy-Report-Only", value: CSP_DIRECTIVES },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
