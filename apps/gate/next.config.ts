import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@worldcoin/idkit", "@anon/world-id"],
  devIndicators: false,
};

export default nextConfig;
