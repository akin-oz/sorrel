import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Workspace packages ship TS/TSX source (main -> src/index.ts), so Next must
  // transpile them rather than treat them as pre-built node_modules.
  transpilePackages: ["@sorrel/ui", "@sorrel/analytics", "@sorrel/shared"],
};

export default nextConfig;
