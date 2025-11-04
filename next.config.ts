import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  output: "standalone",
  serverExternalPackages: ["pg"],
  
  // CRITICAL: Disable aggressive caching for production reliability
  experimental: {
    // Disable static optimization to ensure fresh data
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      const externals = Array.isArray(config.externals) ? config.externals : [];
      externals.push({
        pg: "commonjs pg",
        "pg-native": "commonjs pg-native",
      });
      config.externals = externals;
    }

    return config;
  },
};

export default nextConfig;
