import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable typed routes to avoid strict href validation issues in Docker builds
  typedRoutes: false,
};

export default nextConfig;
