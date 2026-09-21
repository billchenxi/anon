import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@worldcoin/minikit-js", "@worldcoin/idkit"],
  // The dev overlay sits bottom-left, on top of the tab bar. Errors still
  // surface without it, and demo screenshots stay clean.
  devIndicators: false,
};

export default nextConfig;
