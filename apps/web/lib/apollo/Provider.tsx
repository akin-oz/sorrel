"use client";

import type { ReactNode } from "react";

import { HttpLink } from "@apollo/client";
import {
  ApolloClient,
  ApolloNextAppProvider,
  InMemoryCache,
} from "@apollo/client-integration-nextjs";

/**
 * Browser/SSR Apollo client for the wizard's Client Components (spec 013). The
 * endpoint is relative, so it resolves against the current origin — the
 * co-located `/api/graphql` Route Handler — with no env wiring on the client.
 */
function makeClient() {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({ uri: "/api/graphql" }),
  });
}

export function ApolloProvider({ children }: { children: ReactNode }) {
  return <ApolloNextAppProvider makeClient={makeClient}>{children}</ApolloNextAppProvider>;
}
