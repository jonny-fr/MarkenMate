import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  typedRoutes: false,
  output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,
  serverExternalPackages: ["pg", "@napi-rs/canvas"],

  // CRITICAL: Disable aggressive caching for production reliability
  experimental: {
    // Disable static optimization to ensure fresh data
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },

  webpack: (config, { isServer }) => {
    // Force pdfjs-dist to use CommonJS build on server to avoid worker import issues
    if (!config.resolve) config.resolve = {} as typeof config.resolve;
    if (!config.resolve.alias) config.resolve.alias = {} as typeof config.resolve.alias;
    (config.resolve.alias as Record<string, string>)[
      "pdfjs-dist/legacy/build/pdf.mjs"
    ] = "pdfjs-dist/legacy/build/pdf.js";
    // Ensure '@' alias resolves to the src directory (robust in Docker/Linux)
    (config.resolve.alias as Record<string, string>)["@"] = path.resolve(process.cwd(), "src");
    // Allow imports ending with .mjs to resolve to .js as a fallback (for pdfjs-dist worker)
    ;(config.resolve as unknown as { extensionAlias?: Record<string, string[]> }).extensionAlias = {
      ".mjs": [".mjs", ".js"],
    };

    if (isServer) {
      const externals = Array.isArray(config.externals) ? config.externals : [];
      externals.push({
        pg: "commonjs pg",
        "pg-native": "commonjs pg-native",
        "@napi-rs/canvas": "commonjs @napi-rs/canvas",
      });
      config.externals = externals;
    }

    return config;
  },
};

export default nextConfig;
