import type { NextConfig } from "next";

/**
 * Deliberately close to empty.
 *
 * There are no remote images to whitelist (the entire visual world is drawn in
 * code: canvas, CSS and SVG), no rewrites, and no experimental flags. Every
 * option added here is one more thing that can differ between your machine and
 * a deploy, so the list stays at what is actually needed.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,

  // The signature core and the scroll engine both read layout on mount. Strict
  // mode double-invokes effects in development, which is exactly the pressure
  // that catches a missing cleanup, so it stays on.

  eslint: {
    // Fail the production build on a lint error rather than warning past it.
    ignoreDuringBuilds: false,
  },

  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
