import type { NextConfig } from "next";

const pollingInterval = Number(process.env.WATCHPACK_POLLING_INTERVAL ?? "100");
const aggregateTimeout = Number(
  process.env.WATCHPACK_AGGREGATE_TIMEOUT ?? "200",
);

const nextConfig: NextConfig = {
  // Disable typed routes to avoid strict href validation issues in Docker builds
  typedRoutes: false,
  webpackDevMiddleware: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      poll: pollingInterval,
      aggregateTimeout,
      ignored: config.watchOptions?.ignored ?? ["**/node_modules/**"],
    };
    return config;
  },
};

export default nextConfig;
