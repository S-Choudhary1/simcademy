import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this app. A stray package-lock.json exists higher
  // up the tree; without this, Next infers the wrong root for file tracing.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
