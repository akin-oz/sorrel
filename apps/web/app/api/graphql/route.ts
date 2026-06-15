import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginLandingPageProductionDefault } from "@apollo/server/plugin/landingPage/default";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import type { NextRequest } from "next/server";

import { resolvers, typeDefs } from "@sorrel/api";

import { clientIp, rateLimit } from "../../../lib/rate-limit";

/**
 * Co-located GraphQL endpoint (spec 013).
 *
 * The same schema + `@sorrel/api` resolvers the standalone mock serves, mounted
 * as a Next Route Handler so the funnel's write-path works on the live deploy
 * with no second service. Node runtime (Apollo Server needs it); dynamic so the
 * mutations are never cached.
 *
 * Spec 041 §2: introspection + Sandbox landing page are off in production;
 * input length caps live in `services/api/src/resolvers.ts`.
 * Spec 041 §5: per-IP rate limit (in-memory token bucket).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isProd = process.env.NODE_ENV === "production";

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: !isProd,
  plugins: isProd ? [ApolloServerPluginLandingPageProductionDefault({ footer: false })] : [],
});

const handler = startServerAndCreateNextHandler<NextRequest>(server);

function rateLimited(request: NextRequest): Response | null {
  const limit = rateLimit(`graphql:${clientIp(request)}`, 60, 60_000);
  if (limit.ok) return null;
  return new Response(JSON.stringify({ error: "rate_limited" }), {
    status: 429,
    headers: {
      "Retry-After": String(limit.retryAfter),
      "Content-Type": "application/json",
    },
  });
}

export function GET(request: NextRequest): Promise<Response> {
  const blocked = rateLimited(request);
  if (blocked) return Promise.resolve(blocked);
  return handler(request);
}

export function POST(request: NextRequest): Promise<Response> {
  const blocked = rateLimited(request);
  if (blocked) return Promise.resolve(blocked);
  return handler(request);
}
