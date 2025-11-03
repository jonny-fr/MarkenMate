import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  output: "standalone",
  serverExternalPackages: ["pg"],
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
