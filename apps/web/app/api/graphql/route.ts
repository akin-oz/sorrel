import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import type { NextRequest } from "next/server";

import { resolvers, typeDefs } from "@sorrel/api";

/**
 * Co-located GraphQL endpoint (spec 013).
 *
 * The same schema + `@sorrel/api` resolvers the standalone mock serves, mounted
 * as a Next Route Handler so the funnel's write-path works on the live deploy
 * with no second service. Node runtime (Apollo Server needs it); dynamic so the
 * mutations are never cached.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const server = new ApolloServer({ typeDefs, resolvers });

const handler = startServerAndCreateNextHandler<NextRequest>(server);

export function GET(request: NextRequest): Promise<Response> {
  return handler(request);
}

export function POST(request: NextRequest): Promise<Response> {
  return handler(request);
}
