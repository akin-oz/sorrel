import { HttpLink } from "@apollo/client";
import {
  ApolloClient,
  InMemoryCache,
  registerApolloClient,
} from "@apollo/client-integration-nextjs";

import { graphqlEndpoint } from "./endpoint";

/**
 * Per-request Apollo client for React Server Components (spec 013).
 *
 * `registerApolloClient` hands each request its own client + cache, so a draft
 * read in one user's RSC render can never bleed into another's. `getClient()` /
 * `query()` run server-side reads; `PreloadQuery` hands a server-started query
 * to client components. `registerApolloClient` is only exported under the
 * `react-server` condition, so importing this from a Client Component is a build
 * error by construction — exactly the boundary we want.
 */
export const { getClient, query, PreloadQuery } = registerApolloClient(
  () =>
    new ApolloClient({
      cache: new InMemoryCache(),
      link: new HttpLink({ uri: graphqlEndpoint() }),
    }),
);
