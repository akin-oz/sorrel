import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Workspace packages ship TS/TSX source (main -> src/index.ts), so Next must
  // transpile them rather than treat them as pre-built node_modules.
  transpilePackages: ["@sorrel/ui", "@sorrel/analytics", "@sorrel/shared"],
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
