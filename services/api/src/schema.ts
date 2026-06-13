import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { resolvers } from "./resolvers";

/**
 * The executable schema, server-free: SDL + resolvers, with no `listen`. The
 * standalone dev server (`index.ts`) and the web app's co-located Route Handler
 * both build their `ApolloServer` from these — one schema, two hosts.
 *
 * `schema.graphql` is the contract root of the monorepo, three levels up from
 * services/api/src.
 */
const here = dirname(fileURLToPath(import.meta.url));
export const typeDefs = readFileSync(join(here, "..", "..", "..", "schema.graphql"), "utf8");

export { resolvers };
