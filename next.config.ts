import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable typed routes to avoid strict href validation issues in Docker builds
  typedRoutes: false,
  // Enable instrumentation to run server lifecycle hooks
  instrumentationHook: true,
};

export default nextConfig;
