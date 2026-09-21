import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone with only the files the server needs, so the
  // container does not have to carry node_modules.
  output: "standalone",
  transpilePackages: ["@worldcoin/minikit-js", "@worldcoin/idkit", "@anon/world-id"],
  // The landing page is static HTML in public/site. Next serves public files by
  // exact path only, so /site would 404 without this — and /site/index.html is
  // not a URL to put in a form.
  async rewrites() {
    return [
      { source: "/site", destination: "/site/index.html" },
      { source: "/site/support", destination: "/site/support/index.html" },
    ];
  },
  // The dev overlay sits bottom-left, on top of the tab bar. Errors still
  // surface without it, and demo screenshots stay clean.
  devIndicators: false,
};

export default nextConfig;
