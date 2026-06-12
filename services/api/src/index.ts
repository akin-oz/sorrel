import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { resolvers } from "./resolvers";

const here = dirname(fileURLToPath(import.meta.url));
const typeDefs = readFileSync(join(here, "..", "..", "schema.graphql"), "utf8");

const server = new ApolloServer({ typeDefs, resolvers });

const { url } = await startStandaloneServer(server, { listen: { port: 4000 } });

console.warn(`Apollo Server ready at ${url}`);
